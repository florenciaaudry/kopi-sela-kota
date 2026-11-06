-- Expiry is enforced immediately in availability and stock operations; cron persists expiry/audit each minute.
begin;
create extension if not exists pg_cron;

create or replace function public._expire_pos_holds_system(p_actor uuid default null,p_source text default 'scheduled')
returns integer language plpgsql security definer set search_path='' as $$
declare h public.pos_holds%rowtype; expired_count integer:=0; actor_name text;
begin
  if p_actor is not null then select full_name into actor_name from public.profiles where id=p_actor; end if;
  for h in select * from public.pos_holds where status='Open' and expires_at<=now() order by expires_at,number for update loop
    update public.inventory_reservations set status='expired' where source_type='pos_hold' and source_reference=h.number and status='active';
    update public.pos_holds set status='Expired' where number=h.number;
    insert into public.audit_events(actor_id,actor_label,action,document_type,document_number,details)
      values(p_actor,coalesce(actor_name,'System'),'expire','pos_hold',h.number,jsonb_build_object('expires_at',h.expires_at,'trigger',p_source));
    expired_count:=expired_count+1;
  end loop;
  return expired_count;
end; $$;
revoke all on function public._expire_pos_holds_system(uuid,text) from public,anon,authenticated;

create or replace function public.expire_pos_holds()
returns integer language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_transaction_role(array['cashier','owner']::public.app_role[]);
begin return public._expire_pos_holds_system(actor,'cashier_check'); end; $$;
revoke all on function public.expire_pos_holds() from public,anon;
grant execute on function public.expire_pos_holds() to authenticated;

create or replace function public._active_reservation_quantity(p_sku text,p_location text)
returns integer language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=public.require_transaction_role(array['sales','warehouse','procurement','finance','cashier','owner']::public.app_role[]);
begin
 return (select coalesce(sum(ir.quantity),0)::integer from public.inventory_reservations ir
  where ir.sku=p_sku and ir.location_code=p_location and ir.status='active'
    and (ir.source_type<>'pos_hold' or exists(select 1 from public.pos_holds h where h.number=ir.source_reference and h.status='Open' and h.expires_at>now())));
end; $$;
revoke all on function public._active_reservation_quantity(text,text) from public,anon;
grant execute on function public._active_reservation_quantity(text,text) to authenticated;

create or replace view public.inventory_availability with(security_invoker=true) as
 select sb.sku,sb.location_code,sb.on_hand,
 public._active_reservation_quantity(sb.sku,sb.location_code) as reserved,
 sb.on_hand-public._active_reservation_quantity(sb.sku,sb.location_code) as available
 from public.stock_balances sb;

create or replace function public.create_sales_order(
  p_customer_id text,
  p_sku text,
  p_quantity integer,
  p_discount_percent numeric default 0,
  p_idempotency_key text default null,
  p_source_lead_number text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['sales', 'owner']::public.app_role[]);
  customer_row public.customers%rowtype;
  product_row public.products%rowtype;
  stock_row public.stock_balances%rowtype;
  order_number text;
  existing_number text;
  outstanding numeric(14, 2);
  committed numeric(14, 2);
  subtotal numeric(14, 2);
  tax_amount numeric(14, 2);
  tax_rate numeric(5, 2);
  available_quantity integer;
begin
  perform public._expire_pos_holds_system(actor_id,'create_sales_order');
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'Idempotency key wajib diisi';
  end if;
  perform public.lock_transaction_key(p_idempotency_key);
  if p_quantity is null or p_quantity <= 0 then raise exception 'Kuantitas harus lebih dari nol'; end if;
  if p_discount_percent is null or p_discount_percent < 0 or p_discount_percent > 5 then
    raise exception 'Diskon harus 0–5%%; persetujuan diskon lebih tinggi belum diaktifkan';
  end if;

  select so.number into existing_number from public.sales_orders so
  where so.idempotency_key = p_idempotency_key;
  if existing_number is not null then
    if not exists (
      select 1 from public.sales_orders so
      join public.sales_order_lines sol on sol.sales_order_number = so.number
      where so.number = existing_number and so.customer_id = p_customer_id
        and sol.sku = p_sku and sol.quantity = p_quantity
        and so.discount_percent = p_discount_percent
        and so.source_lead_number is not distinct from p_source_lead_number
    ) then raise exception 'Idempotency key sudah digunakan untuk Sales Order berbeda'; end if;
    return existing_number;
  end if;

  select * into customer_row from public.customers where id = p_customer_id for update;
  if not found then raise exception 'Pelanggan tidak ditemukan'; end if;
  select * into product_row from public.products where sku = p_sku;
  if not found then raise exception 'SKU tidak ditemukan'; end if;
  if product_row.sales_price <= 0 then raise exception 'Harga jual harus lebih besar dari nol'; end if;
  if p_source_lead_number is not null and not exists (
    select 1 from public.leads l
    where l.number = p_source_lead_number
      and l.customer_id = p_customer_id
      and l.stage = 'Won'
  ) then raise exception 'Lead sumber harus berstatus Won dan milik pelanggan yang sama'; end if;
  select * into stock_row from public.stock_balances
  where sku = p_sku and location_code = 'WH-TBT' for update;
  if not found then raise exception 'Saldo gudang tidak ditemukan'; end if;

  select stock_row.on_hand - coalesce(sum(ir.quantity) filter (where ir.status = 'active'), 0)
    into available_quantity
  from public.inventory_reservations ir
  where ir.sku = p_sku and ir.location_code = 'WH-TBT';
  if available_quantity < p_quantity then raise exception 'Available WH-TBT tidak mencukupi'; end if;

  select coalesce(sum(ci.total - ci.amount_paid - ci.amount_credited), 0)
  into outstanding from public.customer_invoices ci
  where ci.customer_id = p_customer_id and ci.status = 'Posted';
  select coalesce(sum(so.total - coalesce(invoiced.amount, 0)), 0)
  into committed
  from public.sales_orders so
  left join lateral (
    select sum(ci.total) as amount from public.customer_invoices ci
    where left(ci.source_document, length(so.number) + 1) = so.number || ':' and ci.status = 'Posted'
  ) invoiced on true
  where so.customer_id = p_customer_id and so.status in ('Sales Order', 'Partial Delivery', 'Delivered');

  select rate into tax_rate from public.tax_rates where id = 'PBJT10';
  subtotal := round(product_row.sales_price * p_quantity * (1 - p_discount_percent / 100), 0);
  tax_amount := round(subtotal * tax_rate / 100, 0);
  if outstanding + committed + subtotal + tax_amount > customer_row.credit_limit then
    raise exception 'Limit kredit terlampaui: eksposur %, limit %',
      outstanding + committed + subtotal + tax_amount, customer_row.credit_limit;
  end if;

  order_number := 'S' || lpad(nextval('public.sales_order_number_seq')::text, 5, '0');
  insert into public.sales_orders (
    number, customer_id, source_lead_number, status, order_date, location_code,
    discount_percent, subtotal, tax_total, total, locked_at, idempotency_key, request_hash
  ) values (
    order_number, p_customer_id, p_source_lead_number, 'Sales Order',
    (now() at time zone 'Asia/Jakarta')::date, 'WH-TBT',
    p_discount_percent, subtotal, tax_amount, subtotal + tax_amount, now(),
    p_idempotency_key, md5(p_customer_id::text || '|' || p_sku || '|' || p_quantity::text || '|' || p_discount_percent::text)
  );
  insert into public.sales_order_lines (
    sales_order_number, sku, quantity, unit_price, discount_percent,
    tax_code, subtotal, tax_amount
  ) values (
    order_number, p_sku, p_quantity, product_row.sales_price, p_discount_percent,
    'PBJT10', subtotal, tax_amount
  );
  insert into public.inventory_reservations (
    sku, location_code, source_type, source_reference, quantity, status
  ) values (p_sku, 'WH-TBT', 'sales_order', order_number, p_quantity, 'active');
  perform public.write_business_audit('create', 'sales_order', order_number,
    jsonb_build_object('customer_id', p_customer_id, 'sku', p_sku, 'quantity', p_quantity, 'total', subtotal + tax_amount));
  return order_number;
end;
$$;

create or replace function public.transfer_inventory(
  p_sku text,
  p_source_location text,
  p_destination_location text,
  p_quantity integer,
  p_idempotency_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['warehouse', 'owner']::public.app_role[]);
  source_row public.stock_balances%rowtype;
  transfer_number text;
  reserved_quantity integer;
begin
  perform public._expire_pos_holds_system(actor_id,'transfer_inventory');
  if p_quantity is null or p_quantity <= 0 or p_source_location = p_destination_location or p_idempotency_key is null then
    raise exception 'SKU, lokasi berbeda, kuantitas positif, dan idempotency key wajib';
  end if;
  perform public.lock_transaction_key(p_idempotency_key);
  select it.number into transfer_number from public.inventory_transfers it where it.idempotency_key = p_idempotency_key;
  if transfer_number is not null then
    if not exists (
      select 1 from public.inventory_transfers it where it.number = transfer_number
        and it.sku = p_sku and it.source_location = p_source_location
        and it.destination_location = p_destination_location and it.quantity = p_quantity
    ) then raise exception 'Idempotency key sudah digunakan untuk transfer berbeda'; end if;
    return transfer_number;
  end if;
  perform 1 from public.stock_balances
    where sku = p_sku and location_code in (p_source_location, p_destination_location)
    order by location_code for update;
  select * into source_row from public.stock_balances
    where sku = p_sku and location_code = p_source_location;
  if not found then raise exception 'Saldo lokasi sumber tidak ditemukan'; end if;
  perform 1 from public.stock_balances
    where sku = p_sku and location_code = p_destination_location;
  if not found then raise exception 'Saldo lokasi tujuan tidak ditemukan'; end if;
  select coalesce(sum(ir.quantity), 0)::integer into reserved_quantity
    from public.inventory_reservations ir
    where ir.sku = p_sku and ir.location_code = p_source_location and ir.status = 'active';
  if source_row.on_hand - reserved_quantity < p_quantity then raise exception 'Transfer melebihi Available pada lokasi sumber'; end if;
  transfer_number := 'TRF' || lpad(nextval('public.transfer_number_seq')::text, 5, '0');
  update public.stock_balances set on_hand = on_hand - p_quantity
    where sku = p_sku and location_code = p_source_location;
  update public.stock_balances set on_hand = on_hand + p_quantity
    where sku = p_sku and location_code = p_destination_location;
  insert into public.inventory_transfers (
    number, sku, source_location, destination_location, quantity, idempotency_key, created_by
  ) values (
    transfer_number, p_sku, p_source_location, p_destination_location, p_quantity, p_idempotency_key, actor_id
  );
  perform public.write_business_audit('transfer', 'inventory_transfer', transfer_number,
    jsonb_build_object('sku', p_sku, 'source', p_source_location, 'destination', p_destination_location, 'quantity', p_quantity));
  return transfer_number;
end;
$$;

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
  perform public._expire_pos_holds_system(actor_id,'create_pos_sale');
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

create or replace function public.get_owner_dashboard()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  perform public.require_transaction_role(array['owner', 'finance']::public.app_role[]);
  perform public._expire_pos_holds_system(auth.uid(),'dashboard_check');
  select jsonb_build_object(
    'sku_count', (select count(*) from public.products),
    'location_count', (select count(*) from public.locations),
    'on_hand', (select coalesce(sum(on_hand), 0) from public.stock_balances),
    'reserved', (select coalesce(sum(quantity), 0) from public.inventory_reservations where status = 'active'),
    'receivables', (select coalesce(sum(total - amount_paid - amount_credited), 0) from public.customer_invoices where status = 'Posted'),
    'payables', (select coalesce(sum(total - amount_paid), 0) from public.vendor_bills where status = 'Posted'),
    'cash', (select coalesce(sum(jl.debit - jl.credit), 0) from public.journal_lines jl join public.journal_entries je on je.id = jl.journal_entry_id where je.status = 'posted' and jl.account_code = '1101'),
    'bank', (select coalesce(sum(jl.debit - jl.credit), 0) from public.journal_lines jl join public.journal_entries je on je.id = jl.journal_entry_id where je.status = 'posted' and jl.account_code = '1102'),
    'inventory_value', (select coalesce(sum(sb.on_hand * pc.standard_cost), 0) from public.stock_balances sb join public.product_costs pc on pc.sku = sb.sku)
  ) into result;
  return result;
end;
$$;

do $schedule$ begin
 if to_regprocedure('cron.schedule(text,text,text)') is null then raise exception 'Named cron scheduling is required'; end if;
 perform cron.schedule('kopi-sela-expire-pos-holds','* * * * *','select public._expire_pos_holds_system();');
end $schedule$;
notify pgrst,'reload schema';

commit;
