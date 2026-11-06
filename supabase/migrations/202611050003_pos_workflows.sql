create sequence public.pos_hold_number_seq start with 1;

create table public.pos_holds (
  number text primary key,
  session_number text not null references public.pos_sessions (number),
  idempotency_key text not null unique,
  status text not null check (status in ('Open', 'Completed', 'Cancelled', 'Expired')),
  expires_in_minutes integer not null check (expires_in_minutes between 1 and 1440),
  expires_at timestamptz not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.pos_hold_lines (
  id uuid primary key default gen_random_uuid(),
  hold_number text not null references public.pos_holds (number) on delete restrict,
  sku text not null references public.products (sku),
  quantity integer not null check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price > 0),
  subtotal numeric(14, 2) not null check (subtotal > 0),
  tax_amount numeric(14, 2) not null check (tax_amount >= 0),
  standard_cost numeric(14, 2) not null check (standard_cost >= 0),
  unique (hold_number, sku)
);

create table public.pos_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null references public.pos_receipts (number) on delete restrict,
  sku text not null references public.products (sku),
  quantity integer not null check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price > 0),
  subtotal numeric(14, 2) not null check (subtotal > 0),
  tax_amount numeric(14, 2) not null check (tax_amount >= 0),
  unique (receipt_number, sku)
);

create table public.pos_receipt_tenders (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null references public.pos_receipts (number) on delete restrict,
  payment_method text not null references public.pos_payment_methods (id),
  amount numeric(14, 2) not null check (amount > 0),
  unique (receipt_number, payment_method)
);

alter table public.pos_receipts
  add column hold_number text references public.pos_holds (number);

insert into public.pos_payment_methods (id, name, account_code, settlement)
values ('MIXED', 'Cash + Bank', '1101', 'Split tender')
on conflict (id) do update set
  name = excluded.name, account_code = excluded.account_code, settlement = excluded.settlement;

alter table public.pos_holds enable row level security;
alter table public.pos_hold_lines enable row level security;
alter table public.pos_receipt_lines enable row level security;
alter table public.pos_receipt_tenders enable row level security;

create policy "POS holds readable by Cashier and Owner"
on public.pos_holds for select to authenticated
using (public.has_app_role(array['cashier', 'owner']::public.app_role[]));
create policy "POS hold lines readable by Cashier and Owner"
on public.pos_hold_lines for select to authenticated
using (public.has_app_role(array['cashier', 'owner']::public.app_role[]));
create policy "POS receipt lines readable by Cashier and Owner"
on public.pos_receipt_lines for select to authenticated
using (public.has_app_role(array['cashier', 'owner']::public.app_role[]));
create policy "POS receipt tenders readable by Cashier and Owner"
on public.pos_receipt_tenders for select to authenticated
using (public.has_app_role(array['cashier', 'owner']::public.app_role[]));

grant select on table public.pos_holds, public.pos_hold_lines, public.pos_receipt_lines, public.pos_receipt_tenders
to authenticated;
revoke insert, update, delete on table public.pos_holds, public.pos_hold_lines, public.pos_receipt_lines, public.pos_receipt_tenders
from anon, authenticated;

create function public.expire_pos_holds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['cashier', 'owner']::public.app_role[]);
  hold_row public.pos_holds%rowtype;
  expired_count integer := 0;
begin
  for hold_row in
    select * from public.pos_holds
    where status = 'Open' and expires_at <= now()
    order by expires_at, number
    for update
  loop
    update public.inventory_reservations set status = 'expired'
    where source_type = 'pos_hold' and source_reference = hold_row.number and status = 'active';
    update public.pos_holds set status = 'Expired' where number = hold_row.number;
    perform public.write_business_audit('expire', 'pos_hold', hold_row.number);
    expired_count := expired_count + 1;
  end loop;
  return expired_count;
end;
$$;

create function public.create_pos_hold(
  p_lines jsonb,
  p_expires_in_minutes integer,
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
  item record;
  stock_row public.stock_balances%rowtype;
  product_row public.products%rowtype;
  cost numeric(14, 2);
  tax_rate numeric(5, 2);
  hold_number text;
  hold_expires_at timestamptz;
  existing_lines jsonb;
  requested_lines jsonb;
  reserved integer;
begin
  if p_idempotency_key is null or btrim(p_idempotency_key) = ''
     or p_lines is null or jsonb_typeof(p_lines) <> 'array'
     or jsonb_array_length(p_lines) = 0 then
    raise exception 'Barang dan idempotency key wajib diisi';
  end if;
  if p_expires_in_minutes is null or p_expires_in_minutes not between 1 and 1440 then
    raise exception 'Durasi hold harus antara 1 dan 1440 menit';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_lines) as requested(sku text, quantity integer)
    where requested.sku is null or requested.quantity is null or requested.quantity <= 0
  ) then raise exception 'Setiap baris hold harus memiliki SKU dan kuantitas positif'; end if;
  if (select count(*) from jsonb_to_recordset(p_lines) as requested(sku text, quantity integer))
     <> (select count(distinct requested.sku) from jsonb_to_recordset(p_lines) as requested(sku text, quantity integer)) then
    raise exception 'SKU duplikat harus digabung menjadi satu baris';
  end if;
  perform public.lock_transaction_key(p_idempotency_key);
  perform public.expire_pos_holds();
  select ph.number into hold_number from public.pos_holds ph where ph.idempotency_key = p_idempotency_key;
  if hold_number is not null then
    select jsonb_agg(jsonb_build_object('sku', phl.sku, 'quantity', phl.quantity) order by phl.sku)
      into existing_lines from public.pos_hold_lines phl where phl.hold_number = hold_number;
    select jsonb_agg(jsonb_build_object('sku', requested.sku, 'quantity', requested.quantity) order by requested.sku)
      into requested_lines from jsonb_to_recordset(p_lines) as requested(sku text, quantity integer);
    if not exists (
      select 1 from public.pos_holds ph where ph.number = hold_number
        and ph.created_by = actor_id and ph.expires_in_minutes = p_expires_in_minutes
    ) or existing_lines is distinct from requested_lines then
      raise exception 'Idempotency key sudah digunakan untuk hold berbeda';
    end if;
    return hold_number;
  end if;
  hold_expires_at := clock_timestamp() + make_interval(mins => p_expires_in_minutes);
  select * into session_row from public.pos_sessions
    where opened_by = actor_id and status = 'Open' for update;
  if not found then raise exception 'Kasir belum membuka sesi POS'; end if;
  select * into configuration from public.pos_configuration where id = 'POS-TBT';
  if not found then raise exception 'Konfigurasi POS tidak ditemukan'; end if;
  for item in
    select requested.sku, requested.quantity
    from jsonb_to_recordset(p_lines) as requested(sku text, quantity integer)
    order by requested.sku
  loop
    select * into product_row from public.products where sku = item.sku;
    if not found or product_row.sales_price <= 0 then raise exception 'SKU % tidak ditemukan atau harga tidak valid', item.sku; end if;
    select standard_cost into cost from public.product_costs where sku = item.sku;
    if not found then raise exception 'Biaya standar SKU % tidak ditemukan', item.sku; end if;
    select rate into tax_rate from public.tax_rates where id = 'PBJT10';
    select * into stock_row from public.stock_balances
      where sku = item.sku and location_code = configuration.location_code for update;
    if not found then raise exception 'Saldo POS SKU % tidak ditemukan', item.sku; end if;
    select coalesce(sum(ir.quantity), 0)::integer into reserved
      from public.inventory_reservations ir
      where ir.sku = item.sku and ir.location_code = configuration.location_code and ir.status = 'active';
    if stock_row.on_hand - reserved < item.quantity then
      raise exception 'Available POS SKU % tidak mencukupi', item.sku;
    end if;
  end loop;
  hold_number := 'HOLD/' || lpad(nextval('public.pos_hold_number_seq')::text, 5, '0');
  insert into public.pos_holds (
    number, session_number, idempotency_key, status, expires_in_minutes, expires_at, created_by
  ) values (
    hold_number, session_row.number, p_idempotency_key, 'Open', p_expires_in_minutes, hold_expires_at, actor_id
  );
  for item in
    select requested.sku, requested.quantity
    from jsonb_to_recordset(p_lines) as requested(sku text, quantity integer)
    order by requested.sku
  loop
    select sales_price into product_row.sales_price from public.products where sku = item.sku;
    select standard_cost into cost from public.product_costs where sku = item.sku;
    select rate into tax_rate from public.tax_rates where id = 'PBJT10';
    insert into public.pos_hold_lines (hold_number, sku, quantity, unit_price, subtotal, tax_amount, standard_cost)
    values (
      hold_number, item.sku, item.quantity, product_row.sales_price,
      item.quantity * product_row.sales_price,
      round(item.quantity * product_row.sales_price * tax_rate / 100, 0), cost
    );
    insert into public.inventory_reservations (
      sku, location_code, source_type, source_reference, quantity, status, expires_at
    ) values (
      item.sku, configuration.location_code, 'pos_hold', hold_number, item.quantity, 'active', hold_expires_at
    );
  end loop;
  perform public.write_business_audit('create', 'pos_hold', hold_number,
    jsonb_build_object('expires_at', hold_expires_at, 'lines', p_lines));
  return hold_number;
end;
$$;

create function public.cancel_pos_hold(p_hold_number text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['cashier', 'owner']::public.app_role[]);
  hold_row public.pos_holds%rowtype;
begin
  perform public.expire_pos_holds();
  select * into hold_row from public.pos_holds where number = p_hold_number for update;
  if not found then raise exception 'Hold POS tidak ditemukan'; end if;
  if hold_row.created_by <> actor_id
     and not public.has_app_role(array['owner']::public.app_role[]) then
    raise exception 'Hold POS hanya dapat dikelola oleh kasir pembuat atau Owner';
  end if;
  if hold_row.status in ('Cancelled', 'Expired') then return hold_row.number; end if;
  if hold_row.status <> 'Open' then raise exception 'Hold POS sudah diselesaikan'; end if;
  update public.inventory_reservations set status = 'released'
    where source_type = 'pos_hold' and source_reference = hold_row.number and status = 'active';
  update public.pos_holds set status = 'Cancelled' where number = hold_row.number;
  perform public.write_business_audit('cancel', 'pos_hold', hold_row.number);
  return hold_row.number;
end;
$$;

create function public.complete_pos_hold(
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

revoke all on function public.expire_pos_holds() from public, anon;
revoke all on function public.create_pos_hold(jsonb, integer, text) from public, anon;
revoke all on function public.cancel_pos_hold(text) from public, anon;
revoke all on function public.complete_pos_hold(text, jsonb, text) from public, anon;
grant execute on function public.expire_pos_holds() to authenticated;
grant execute on function public.create_pos_hold(jsonb, integer, text) to authenticated;
grant execute on function public.cancel_pos_hold(text) to authenticated;
grant execute on function public.complete_pos_hold(text, jsonb, text) to authenticated;
