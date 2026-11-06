-- Mixed payment requires explicit, reconciled tender lines via checkout hold.
begin;
create or replace function public.create_pos_sale(
  p_sku text,
  p_quantity integer,
  p_payment_method text,
  p_idempotency_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['cashier', 'owner']::public.app_role[]);
  configuration public.pos_configuration%rowtype;
  session_row public.pos_sessions%rowtype;
  product_row public.products%rowtype;
  stock_row public.stock_balances%rowtype;
  payment_row public.pos_payment_methods%rowtype;
  receipt_number text;
  quantity_reserved integer;
  subtotal numeric(14, 2);
  tax_amount numeric(14, 2);
  total_amount numeric(14, 2);
  cogs numeric(14, 2);
begin
  if p_payment_method is null or p_payment_method not in ('CASH','BANK') then raise exception 'Untuk Cash + Bank, gunakan Checkout Hold dengan rincian tender'; end if;
  if p_quantity is null or p_quantity <= 0 or p_idempotency_key is null then raise exception 'Kuantitas dan idempotency key wajib'; end if;
  perform public.lock_transaction_key(p_idempotency_key);
  select pr.number into receipt_number from public.pos_receipts pr where pr.idempotency_key = p_idempotency_key;
  if receipt_number is not null then
    if not exists (
      select 1 from public.pos_receipts pr where pr.number = receipt_number
        and pr.sku = p_sku and pr.quantity = p_quantity
        and pr.payment_method = p_payment_method
    ) then raise exception 'Idempotency key sudah digunakan untuk transaksi POS berbeda'; end if;
    return receipt_number;
  end if;
  select * into session_row from public.pos_sessions
    where opened_by = actor_id and status = 'Open' for update;
  if not found then raise exception 'Kasir belum membuka sesi POS'; end if;
  select * into configuration from public.pos_configuration where id = 'POS-TBT';
  select * into product_row from public.products where sku = p_sku;
  if not found then raise exception 'SKU tidak ditemukan'; end if;
  select * into payment_row from public.pos_payment_methods where id = p_payment_method;
  if not found then raise exception 'Metode pembayaran POS tidak dikenal'; end if;
  select * into stock_row from public.stock_balances
    where sku = p_sku and location_code = configuration.location_code for update;
  if not found then raise exception 'Saldo POS tidak ditemukan'; end if;
  select coalesce(sum(ir.quantity), 0)::integer into quantity_reserved
    from public.inventory_reservations ir
    where ir.sku = p_sku and ir.location_code = configuration.location_code and ir.status = 'active';
  if stock_row.on_hand - quantity_reserved < p_quantity then raise exception 'Available POS tidak mencukupi'; end if;
  subtotal := p_quantity * product_row.sales_price;
  tax_amount := round(subtotal * (select rate from public.tax_rates where id = 'PBJT10') / 100, 0);
  total_amount := subtotal + tax_amount;
  select standard_cost * p_quantity into cogs from public.product_costs where sku = p_sku;
  receipt_number := 'POSR' || lpad(nextval('public.pos_receipt_number_seq')::text, 5, '0');
  insert into public.pos_receipts (
    number, session_number, sku, quantity, subtotal, tax_amount, total,
    payment_method, idempotency_key, created_by
  ) values (
    receipt_number, session_row.number, p_sku, p_quantity, subtotal, tax_amount,
    total_amount, p_payment_method, p_idempotency_key, actor_id
  );
  update public.stock_balances set on_hand = on_hand - p_quantity
    where sku = p_sku and location_code = configuration.location_code;
  if p_payment_method = 'CASH' then
    update public.pos_sessions set expected_cash = coalesce(expected_cash, opening_cash) + total_amount
      where number = session_row.number;
  end if;
  perform public.post_business_journal(
    'pos_sale', receipt_number, 'pos-sale:' || p_idempotency_key,
    'Penjualan POS ' || receipt_number,
    jsonb_build_array(
      jsonb_build_object('account_code', payment_row.account_code, 'debit', total_amount, 'credit', 0),
      jsonb_build_object('account_code', '4101', 'debit', 0, 'credit', subtotal),
      jsonb_build_object('account_code', '2102', 'debit', 0, 'credit', tax_amount),
      jsonb_build_object('account_code', '5101', 'debit', cogs, 'credit', 0),
      jsonb_build_object('account_code', '1301', 'debit', 0, 'credit', cogs)
    )
  );
  perform public.write_business_audit('sell', 'pos_receipt', receipt_number,
    jsonb_build_object('sku', p_sku, 'quantity', p_quantity, 'total', total_amount, 'method', p_payment_method));
  return receipt_number;
end;
$$;
revoke all on function public.create_pos_sale(text,integer,text,text) from public,anon;
grant execute on function public.create_pos_sale(text,integer,text,text) to authenticated;
notify pgrst,'reload schema';

commit;
