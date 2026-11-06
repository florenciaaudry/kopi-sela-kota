-- Fix PL/pgSQL variable shadowing in public.complete_pos_hold where
-- local variable "tender record" shadowed the jsonb_to_recordset alias "tender",
-- causing: record "tender" is not assigned yet.
create or replace function public.complete_pos_hold(
  p_hold_number text,
  p_tenders jsonb,
  p_idempotency_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['cashier', 'owner']::public.app_role[]);
  hold_row public.pos_holds%rowtype;
  configuration public.pos_configuration%rowtype;
  item record;
  tender_row record;
  payment_count integer;
  quantity_total integer := 0;
  subtotal_total numeric(14, 2) := 0;
  tax_total numeric(14, 2) := 0;
  cogs_total numeric(14, 2) := 0;
  tender_total numeric(14, 2);
  cash_tender numeric(14, 2);
  receipt_number text;
  first_sku text;
  first_quantity integer;
  payment_method text;
  journal_lines jsonb := '[]'::jsonb;
  existing_hold text;
begin
  if p_hold_number is null or p_idempotency_key is null or p_tenders is null
     or jsonb_typeof(p_tenders) <> 'array' or jsonb_array_length(p_tenders) = 0 then
    raise exception 'Hold, tender, dan idempotency key wajib diisi';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_tenders) as requested_tender(payment_method text, amount numeric)
    where requested_tender.payment_method not in ('CASH', 'BANK') or requested_tender.amount is null or requested_tender.amount <= 0
  ) then raise exception 'Tender hanya menerima Cash/Bank dengan nominal positif'; end if;
  if (select count(*) from jsonb_to_recordset(p_tenders) as requested_tender(payment_method text, amount numeric))
     <> (select count(distinct requested_tender.payment_method) from jsonb_to_recordset(p_tenders) as requested_tender(payment_method text, amount numeric)) then
    raise exception 'Metode tender duplikat harus digabung';
  end if;
  perform public.lock_transaction_key(p_idempotency_key);
  select pr.number into receipt_number from public.pos_receipts pr
    where pr.idempotency_key = p_idempotency_key;
  if receipt_number is not null then
    if not exists (
      select 1 from public.pos_receipts pr where pr.number = receipt_number
        and pr.hold_number = p_hold_number and pr.created_by = actor_id
    ) then raise exception 'Idempotency key sudah digunakan untuk transaksi POS berbeda'; end if;
    return receipt_number;
  end if;
  perform public.expire_pos_holds();
  select * into hold_row from public.pos_holds where number = p_hold_number for update;
  if not found or hold_row.status <> 'Open' or hold_row.expires_at <= now() then
    raise exception 'Hold POS tidak aktif atau sudah kedaluwarsa';
  end if;
  if hold_row.created_by <> actor_id then raise exception 'Hold POS bukan milik sesi kasir ini'; end if;
  select * into configuration from public.pos_configuration where id = 'POS-TBT';
  select coalesce(sum(phl.quantity), 0)::integer,
         coalesce(sum(phl.subtotal), 0), coalesce(sum(phl.tax_amount), 0),
         coalesce(sum(phl.standard_cost * phl.quantity), 0)
    into quantity_total, subtotal_total, tax_total, cogs_total
    from public.pos_hold_lines phl where phl.hold_number = p_hold_number;
  if quantity_total <= 0 then raise exception 'Hold POS tidak memiliki barang'; end if;
  select phl.sku, phl.quantity into first_sku, first_quantity
    from public.pos_hold_lines phl where phl.hold_number = p_hold_number order by phl.sku limit 1;
  select coalesce(sum(requested_tender.amount), 0), count(*),
         coalesce(sum(requested_tender.amount) filter (where requested_tender.payment_method = 'CASH'), 0)
    into tender_total, payment_count, cash_tender
    from jsonb_to_recordset(p_tenders) as requested_tender(payment_method text, amount numeric);
  if tender_total <> subtotal_total + tax_total then
    raise exception 'Total tender % harus sama dengan total struk %', tender_total, subtotal_total + tax_total;
  end if;
  for item in
    select phl.sku, phl.quantity from public.pos_hold_lines phl
    where phl.hold_number = p_hold_number order by phl.sku
  loop
    perform 1 from public.stock_balances
      where sku = item.sku and location_code = configuration.location_code for update;
    if not found then raise exception 'Saldo POS SKU % tidak ditemukan', item.sku; end if;
    if not exists (
      select 1 from public.inventory_reservations ir
      where ir.source_type = 'pos_hold' and ir.source_reference = p_hold_number
        and ir.sku = item.sku and ir.quantity = item.quantity and ir.status = 'active'
    ) then raise exception 'Reservasi hold SKU % tidak aktif', item.sku; end if;
  end loop;
  receipt_number := 'POSR' || lpad(nextval('public.pos_receipt_number_seq')::text, 5, '0');
  payment_method := case when payment_count = 1
    then (select requested_tender.payment_method from jsonb_to_recordset(p_tenders) as requested_tender(payment_method text, amount numeric) limit 1)
    else 'MIXED' end;
  insert into public.pos_receipts (
    number, session_number, sku, quantity, subtotal, tax_amount, total,
    payment_method, idempotency_key, created_by, hold_number
  ) values (
    receipt_number, hold_row.session_number, first_sku, quantity_total,
    subtotal_total, tax_total, subtotal_total + tax_total,
    payment_method, p_idempotency_key, actor_id, p_hold_number
  );
  for item in
    select phl.sku, phl.quantity, phl.unit_price, phl.subtotal, phl.tax_amount
    from public.pos_hold_lines phl where phl.hold_number = p_hold_number order by phl.sku
  loop
    insert into public.pos_receipt_lines (receipt_number, sku, quantity, unit_price, subtotal, tax_amount)
    values (receipt_number, item.sku, item.quantity, item.unit_price, item.subtotal, item.tax_amount);
    update public.stock_balances set on_hand = on_hand - item.quantity
      where sku = item.sku and location_code = configuration.location_code;
    update public.inventory_reservations set status = 'consumed'
      where source_type = 'pos_hold' and source_reference = p_hold_number
        and sku = item.sku and status = 'active';
  end loop;
  for tender_row in
    select requested_tender.payment_method, requested_tender.amount, pm.account_code
    from jsonb_to_recordset(p_tenders) as requested_tender(payment_method text, amount numeric)
    join public.pos_payment_methods pm on pm.id = requested_tender.payment_method
    order by requested_tender.payment_method
  loop
    insert into public.pos_receipt_tenders (receipt_number, payment_method, amount)
    values (receipt_number, tender_row.payment_method, tender_row.amount);
    journal_lines := journal_lines || jsonb_build_array(jsonb_build_object(
      'account_code', tender_row.account_code, 'debit', tender_row.amount, 'credit', 0
    ));
  end loop;
  journal_lines := journal_lines || jsonb_build_array(
    jsonb_build_object('account_code', '4101', 'debit', 0, 'credit', subtotal_total),
    jsonb_build_object('account_code', '2102', 'debit', 0, 'credit', tax_total),
    jsonb_build_object('account_code', '5101', 'debit', cogs_total, 'credit', 0),
    jsonb_build_object('account_code', '1301', 'debit', 0, 'credit', cogs_total)
  );
  update public.pos_sessions set expected_cash = coalesce(expected_cash, opening_cash) + cash_tender
    where number = hold_row.session_number;
  update public.pos_holds set status = 'Completed' where number = p_hold_number;
  perform public.post_business_journal(
    'pos_sale', receipt_number, 'pos-hold-sale:' || p_idempotency_key,
    'Penjualan POS ' || receipt_number, journal_lines
  );
  perform public.write_business_audit('complete', 'pos_hold', p_hold_number,
    jsonb_build_object('receipt', receipt_number, 'tenders', p_tenders));
  return receipt_number;
end;
$$;

-- Extend expiration window for any currently Open POS holds (such as HOLD/00001)
-- that were blocked by the "tender is not assigned yet" bug before completion.
update public.pos_holds
set expires_at = greatest(expires_at, now() + interval '24 hours')
where status = 'Open';

update public.inventory_reservations
set expires_at = greatest(expires_at, now() + interval '24 hours')
where source_type = 'pos_hold' and status = 'active';

