-- GENERATED FILE: apply pending transactions migrations to a database that already ran the foundation setup.
-- Verify that each included migration has not already been applied.
begin;

-- MIGRATION: 202611050002_transactions.sql
create sequence public.sales_order_number_seq start with 2;
create sequence public.lead_number_seq start with 2;
create sequence public.purchase_order_number_seq start with 2;
create sequence public.customer_invoice_number_seq start with 1;
create sequence public.vendor_bill_number_seq start with 1;
create sequence public.delivery_number_seq start with 1;
create sequence public.receipt_number_seq start with 1;
create sequence public.transfer_number_seq start with 1;
create sequence public.credit_note_number_seq start with 1;
create sequence public.pos_receipt_number_seq start with 1;
create sequence public.pos_session_number_seq start with 2;
create sequence public.journal_number_seq start with 1;

alter table public.sales_orders
  add column idempotency_key text unique,
  add column request_hash text;

alter table public.purchase_orders
  add column idempotency_key text unique,
  add column request_hash text;

alter table public.leads
  add column idempotency_key text unique;

create unique index customer_invoices_source_document_unique
  on public.customer_invoices (source_document)
  where source_document is not null;

create unique index vendor_bills_source_document_unique
  on public.vendor_bills (source_document)
  where source_document is not null;

alter table public.customer_invoices
  add column amount_credited numeric(14, 2) not null default 0
    check (amount_credited >= 0 and amount_credited <= total),
  add constraint invoice_paid_and_credited_within_total
    check (amount_paid + amount_credited <= total);

alter table public.purchase_order_lines
  add column received_quantity integer not null default 0 check (received_quantity >= 0),
  add column rejected_quantity integer not null default 0 check (rejected_quantity >= 0),
  add column billed_quantity integer not null default 0 check (billed_quantity >= 0),
  add constraint purchase_line_quantities_within_order
    check (received_quantity + rejected_quantity <= quantity and billed_quantity <= received_quantity);

alter table public.pos_sessions
  add column opened_by uuid references auth.users (id),
  add column idempotency_key text unique,
  add column expected_cash numeric(14, 2),
  add column counted_cash numeric(14, 2),
  add column cash_difference numeric(14, 2),
  add column variance_reason text,
  add column approved_by uuid references auth.users (id);

create unique index one_open_pos_session_per_cashier
  on public.pos_sessions (opened_by)
  where status in ('Open', 'Pending Approval');

create table public.delivery_notes (
  number text primary key,
  sales_order_number text not null references public.sales_orders (number),
  idempotency_key text not null unique,
  delivered_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id)
);

create table public.delivery_note_lines (
  id uuid primary key default gen_random_uuid(),
  delivery_number text not null references public.delivery_notes (number) on delete restrict,
  sales_order_line_id uuid not null references public.sales_order_lines (id),
  sku text not null references public.products (sku),
  quantity integer not null check (quantity > 0),
  unique (delivery_number, sales_order_line_id)
);

create table public.goods_receipts (
  number text primary key,
  purchase_order_number text not null references public.purchase_orders (number),
  idempotency_key text not null unique,
  received_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id)
);

create table public.goods_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null references public.goods_receipts (number) on delete restrict,
  purchase_order_line_id uuid not null references public.purchase_order_lines (id),
  sku text not null references public.products (sku),
  accepted_quantity integer not null check (accepted_quantity >= 0),
  rejected_quantity integer not null check (rejected_quantity >= 0),
  check (accepted_quantity + rejected_quantity > 0),
  unique (receipt_number, purchase_order_line_id)
);

create table public.customer_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null references public.customer_invoices (number) on delete restrict,
  sales_order_line_id uuid references public.sales_order_lines (id),
  sku text not null references public.products (sku),
  quantity integer not null check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  discount_percent numeric(5, 2) not null check (discount_percent between 0 and 10),
  subtotal numeric(14, 2) not null check (subtotal >= 0),
  tax_amount numeric(14, 2) not null check (tax_amount >= 0)
);

create table public.vendor_bill_lines (
  id uuid primary key default gen_random_uuid(),
  bill_number text not null references public.vendor_bills (number) on delete restrict,
  purchase_order_line_id uuid references public.purchase_order_lines (id),
  sku text not null references public.products (sku),
  quantity integer not null check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  subtotal numeric(14, 2) not null check (subtotal >= 0)
);

create table public.customer_payments (
  number text primary key,
  invoice_number text not null references public.customer_invoices (number),
  amount numeric(14, 2) not null check (amount > 0),
  account_code text not null references public.chart_of_accounts (code),
  idempotency_key text not null unique,
  paid_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id)
);

create table public.vendor_payments (
  number text primary key,
  bill_number text not null references public.vendor_bills (number),
  amount numeric(14, 2) not null check (amount > 0),
  account_code text not null references public.chart_of_accounts (code),
  idempotency_key text not null unique,
  paid_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id)
);

create table public.inventory_transfers (
  number text primary key,
  sku text not null references public.products (sku),
  source_location text not null references public.locations (code),
  destination_location text not null references public.locations (code),
  quantity integer not null check (quantity > 0),
  idempotency_key text not null unique,
  transferred_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id),
  check (source_location <> destination_location)
);

create table public.pos_receipts (
  number text primary key,
  session_number text not null references public.pos_sessions (number),
  sku text not null references public.products (sku),
  quantity integer not null check (quantity > 0),
  subtotal numeric(14, 2) not null check (subtotal >= 0),
  tax_amount numeric(14, 2) not null check (tax_amount >= 0),
  total numeric(14, 2) not null check (total = subtotal + tax_amount),
  payment_method text not null references public.pos_payment_methods (id),
  idempotency_key text not null unique,
  sold_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id)
);

create table public.credit_notes (
  number text primary key,
  invoice_number text not null references public.customer_invoices (number),
  idempotency_key text not null unique,
  subtotal numeric(14, 2) not null check (subtotal >= 0),
  tax_amount numeric(14, 2) not null check (tax_amount >= 0),
  total numeric(14, 2) not null check (total = subtotal + tax_amount),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.credit_note_lines (
  id uuid primary key default gen_random_uuid(),
  credit_note_number text not null references public.credit_notes (number) on delete restrict,
  invoice_line_id uuid not null references public.customer_invoice_lines (id),
  sku text not null references public.products (sku),
  quantity integer not null check (quantity > 0),
  item_condition text not null check (item_condition in ('sealed', 'damaged')),
  subtotal numeric(14, 2) not null check (subtotal >= 0),
  tax_amount numeric(14, 2) not null check (tax_amount >= 0)
);

create index delivery_order_idx on public.delivery_notes (sales_order_number, delivered_at);
create index receipt_order_idx on public.goods_receipts (purchase_order_number, received_at);
create index invoice_lines_source_idx on public.customer_invoice_lines (sales_order_line_id);
create index pos_receipts_session_idx on public.pos_receipts (session_number, sold_at);

alter table public.delivery_notes enable row level security;
alter table public.delivery_note_lines enable row level security;
alter table public.goods_receipts enable row level security;
alter table public.goods_receipt_lines enable row level security;
alter table public.customer_invoice_lines enable row level security;
alter table public.vendor_bill_lines enable row level security;
alter table public.customer_payments enable row level security;
alter table public.vendor_payments enable row level security;
alter table public.inventory_transfers enable row level security;
alter table public.pos_receipts enable row level security;
alter table public.credit_notes enable row level security;
alter table public.credit_note_lines enable row level security;

create policy "Delivery records readable by operations and finance"
on public.delivery_notes for select to authenticated
using (public.has_app_role(array['sales', 'warehouse', 'finance', 'owner']::public.app_role[]));
create policy "Delivery lines readable by operations and finance"
on public.delivery_note_lines for select to authenticated
using (public.has_app_role(array['sales', 'warehouse', 'finance', 'owner']::public.app_role[]));
create policy "Receipts readable by procurement, warehouse, finance, and Owner"
on public.goods_receipts for select to authenticated
using (public.has_app_role(array['procurement', 'warehouse', 'finance', 'owner']::public.app_role[]));
create policy "Receipt lines readable by procurement, warehouse, finance, and Owner"
on public.goods_receipt_lines for select to authenticated
using (public.has_app_role(array['procurement', 'warehouse', 'finance', 'owner']::public.app_role[]));
create policy "Invoice lines readable by Sales, Finance, and Owner"
on public.customer_invoice_lines for select to authenticated
using (public.has_app_role(array['sales', 'finance', 'owner']::public.app_role[]));
create policy "Bill lines readable by Finance and Owner"
on public.vendor_bill_lines for select to authenticated
using (public.has_app_role(array['finance', 'owner']::public.app_role[]));
create policy "Customer payments readable by Sales, Finance, and Owner"
on public.customer_payments for select to authenticated
using (public.has_app_role(array['sales', 'finance', 'owner']::public.app_role[]));
create policy "Vendor payments readable by Finance and Owner"
on public.vendor_payments for select to authenticated
using (public.has_app_role(array['finance', 'owner']::public.app_role[]));
create policy "Transfers readable by Warehouse, Procurement, and Owner"
on public.inventory_transfers for select to authenticated
using (public.has_app_role(array['warehouse', 'procurement', 'owner']::public.app_role[]));
create policy "POS receipts readable by Cashier and Owner"
on public.pos_receipts for select to authenticated
using (public.has_app_role(array['cashier', 'owner']::public.app_role[]));
create policy "Credit notes readable by Sales, Finance, Cashier, and Owner"
on public.credit_notes for select to authenticated
using (public.has_app_role(array['sales', 'finance', 'cashier', 'owner']::public.app_role[]));
create policy "Credit note lines readable by Sales, Finance, Cashier, and Owner"
on public.credit_note_lines for select to authenticated
using (public.has_app_role(array['sales', 'finance', 'cashier', 'owner']::public.app_role[]));

grant select on table
  public.delivery_notes,
  public.delivery_note_lines,
  public.goods_receipts,
  public.goods_receipt_lines,
  public.customer_invoice_lines,
  public.vendor_bill_lines,
  public.customer_payments,
  public.vendor_payments,
  public.inventory_transfers,
  public.pos_receipts,
  public.credit_notes,
  public.credit_note_lines
to authenticated;

revoke insert, update, delete on table
  public.profiles,
  public.stock_balances,
  public.inventory_reservations,
  public.sales_orders,
  public.sales_order_lines,
  public.purchase_orders,
  public.purchase_order_lines,
  public.customer_invoices,
  public.vendor_bills,
  public.journal_entries,
  public.journal_lines,
  public.delivery_notes,
  public.delivery_note_lines,
  public.goods_receipts,
  public.goods_receipt_lines,
  public.customer_invoice_lines,
  public.vendor_bill_lines,
  public.customer_payments,
  public.vendor_payments,
  public.inventory_transfers,
  public.pos_receipts,
  public.credit_notes,
  public.credit_note_lines
from anon, authenticated;

create function public.require_transaction_role(allowed_roles public.app_role[])
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null or not public.has_app_role(allowed_roles) then
    raise exception using errcode = '42501', message = 'Role tidak diizinkan untuk transaksi ini';
  end if;
  return actor_id;
end;
$$;

revoke all on function public.require_transaction_role(public.app_role[]) from public, anon, authenticated;

create function public.lock_transaction_key(p_key text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_key));
$$;

revoke all on function public.lock_transaction_key(text) from public, anon, authenticated;

create function public.post_business_journal(
  p_source_type text,
  p_source_reference text,
  p_idempotency_key text,
  p_memo text,
  p_lines jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  journal_id uuid;
  journal_number text;
  existing_number text;
  debit_total numeric(14, 2);
  credit_total numeric(14, 2);
begin
  select je.number into existing_number
  from public.journal_entries je
  where je.idempotency_key = p_idempotency_key;
  if existing_number is not null then
    return existing_number;
  end if;

  select coalesce(sum((line->>'debit')::numeric), 0),
         coalesce(sum((line->>'credit')::numeric), 0)
  into debit_total, credit_total
  from jsonb_array_elements(p_lines) as line;
  if debit_total <= 0 or debit_total <> credit_total then
    raise exception 'Jurnal sumber % tidak seimbang', p_source_reference;
  end if;

  journal_number := 'JRN/' || to_char(current_date, 'YYYYMMDD') || '/' ||
    lpad(nextval('public.journal_number_seq')::text, 5, '0');
  insert into public.journal_entries (
    number, source_type, source_reference, idempotency_key,
    entry_date, memo, status, created_by
  ) values (
    journal_number, p_source_type, p_source_reference, p_idempotency_key,
    (now() at time zone 'Asia/Jakarta')::date, p_memo, 'draft', auth.uid()
  ) returning id into journal_id;

  insert into public.journal_lines (journal_entry_id, account_code, debit, credit)
  select journal_id, item.account_code, item.debit, item.credit
  from jsonb_to_recordset(p_lines) as item(
    account_code text, debit numeric, credit numeric
  )
  where item.debit > 0 or item.credit > 0;
  update public.journal_entries set status = 'posted' where id = journal_id;
  return journal_number;
end;
$$;

revoke all on function public.post_business_journal(text, text, text, text, jsonb) from public, anon, authenticated;

create function public.write_business_audit(
  p_action text,
  p_document_type text,
  p_document_number text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_name text;
begin
  select p.full_name into actor_name from public.profiles p where p.id = actor_id;
  insert into public.audit_events (actor_id, actor_label, action, document_type, document_number, details)
  values (actor_id, coalesce(actor_name, 'Pengguna'), p_action, p_document_type, p_document_number, coalesce(p_details, '{}'::jsonb));
end;
$$;

revoke all on function public.write_business_audit(text, text, text, jsonb) from public, anon, authenticated;

create function public.create_sales_order(
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

create function public.deliver_sales_order(
  p_sales_order_number text,
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
  order_row public.sales_orders%rowtype;
  line_row public.sales_order_lines%rowtype;
  stock_row public.stock_balances%rowtype;
  reservation_row public.inventory_reservations%rowtype;
  delivery_number text;
  prior_delivery text;
  remaining integer;
  cogs numeric(14, 2);
begin
  if p_quantity is null or p_quantity <= 0 or p_idempotency_key is null then raise exception 'Kuantitas dan idempotency key wajib'; end if;
  perform public.lock_transaction_key(p_idempotency_key);
  select dn.number into prior_delivery from public.delivery_notes dn where dn.idempotency_key = p_idempotency_key;
  if prior_delivery is not null then
    if not exists (
      select 1 from public.delivery_notes dn
      join public.delivery_note_lines dnl on dnl.delivery_number = dn.number
      where dn.number = prior_delivery and dn.sales_order_number = p_sales_order_number
        and dnl.quantity = p_quantity
    ) then raise exception 'Idempotency key sudah digunakan untuk pengiriman berbeda'; end if;
    return prior_delivery;
  end if;

  select * into order_row from public.sales_orders where number = p_sales_order_number for update;
  if not found or order_row.status not in ('Sales Order', 'Partial Delivery') then raise exception 'Sales Order tidak dapat dikirim'; end if;
  select * into line_row from public.sales_order_lines where sales_order_number = p_sales_order_number for update;
  select * into stock_row from public.stock_balances
    where sku = line_row.sku and location_code = order_row.location_code for update;
  select * into reservation_row from public.inventory_reservations
    where source_type = 'sales_order' and source_reference = p_sales_order_number
      and sku = line_row.sku and location_code = order_row.location_code
    for update;
  select line_row.quantity - coalesce(sum(dnl.quantity), 0)
    into remaining
  from public.delivery_note_lines dnl
  join public.delivery_notes dn on dn.number = dnl.delivery_number
  where dnl.sales_order_line_id = line_row.id;
  if p_quantity > remaining or reservation_row.status <> 'active' or p_quantity > reservation_row.quantity then
    raise exception 'Kuantitas melebihi sisa pesanan atau reservasi aktif';
  end if;
  if stock_row.on_hand < p_quantity then raise exception 'On Hand gudang tidak mencukupi'; end if;

  delivery_number := 'DN' || lpad(nextval('public.delivery_number_seq')::text, 5, '0');
  insert into public.delivery_notes (number, sales_order_number, idempotency_key, created_by)
  values (delivery_number, p_sales_order_number, p_idempotency_key, actor_id);
  insert into public.delivery_note_lines (delivery_number, sales_order_line_id, sku, quantity)
  values (delivery_number, line_row.id, line_row.sku, p_quantity);
  update public.stock_balances set on_hand = on_hand - p_quantity
    where sku = line_row.sku and location_code = order_row.location_code;
  if reservation_row.quantity = p_quantity then
    update public.inventory_reservations set quantity = p_quantity, status = 'consumed'
      where id = reservation_row.id;
  else
    update public.inventory_reservations set quantity = quantity - p_quantity
      where id = reservation_row.id;
  end if;
  select standard_cost * p_quantity into cogs from public.product_costs where sku = line_row.sku;
  perform public.post_business_journal(
    'delivery', delivery_number, 'delivery:' || p_idempotency_key,
    'HPP pengiriman ' || p_sales_order_number,
    jsonb_build_array(
      jsonb_build_object('account_code', '5101', 'debit', cogs, 'credit', 0),
      jsonb_build_object('account_code', '1301', 'debit', 0, 'credit', cogs)
    )
  );
  if remaining = p_quantity then
    update public.sales_orders set status = 'Delivered' where number = p_sales_order_number;
  else
    update public.sales_orders set status = 'Partial Delivery' where number = p_sales_order_number;
  end if;
  perform public.write_business_audit('deliver', 'delivery', delivery_number,
    jsonb_build_object('sales_order', p_sales_order_number, 'sku', line_row.sku, 'quantity', p_quantity));
  return delivery_number;
end;
$$;

create function public.invoice_delivered_sales_order(
  p_sales_order_number text,
  p_idempotency_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['finance', 'owner']::public.app_role[]);
  order_row public.sales_orders%rowtype;
  line_row record;
  invoice_number text;
  existing_number text;
  invoice_subtotal numeric(14, 2) := 0;
  invoice_tax numeric(14, 2) := 0;
  line_subtotal numeric(14, 2);
  line_tax numeric(14, 2);
  delivered_qty integer := 0;
  invoiced_qty integer;
  due_days integer;
begin
  if p_idempotency_key is null then raise exception 'Idempotency key wajib'; end if;
  perform public.lock_transaction_key(p_idempotency_key);
  select ci.number into existing_number from public.customer_invoices ci
    where ci.source_document = p_sales_order_number || ':' || p_idempotency_key;
  if existing_number is not null then return existing_number; end if;
  select * into order_row from public.sales_orders where number = p_sales_order_number for update;
  if not found then raise exception 'Sales Order tidak ditemukan'; end if;
  select pt.days into due_days
    from public.customers c join public.payment_terms pt on pt.code = c.payment_terms_code
    where c.id = order_row.customer_id;

  for line_row in
    select sol.id, sol.sku, sol.quantity, sol.unit_price, sol.discount_percent,
      coalesce((select sum(dnl.quantity) from public.delivery_note_lines dnl where dnl.sales_order_line_id = sol.id), 0)::integer as delivered,
      coalesce((select sum(cil.quantity) from public.customer_invoice_lines cil where cil.sales_order_line_id = sol.id), 0)::integer as invoiced
    from public.sales_order_lines sol
    where sol.sales_order_number = p_sales_order_number
    for update
  loop
    delivered_qty := delivered_qty + line_row.delivered - line_row.invoiced;
  end loop;
  if coalesce(delivered_qty, 0) <= 0 then raise exception 'Tidak ada kuantitas Delivered yang belum ditagih'; end if;

  invoice_number := 'INV' || lpad(nextval('public.customer_invoice_number_seq')::text, 5, '0');
  insert into public.customer_invoices (
    number, customer_id, source_document, status, issue_date, due_date,
    subtotal, tax_total, total, amount_paid
  ) values (
    invoice_number, order_row.customer_id,
    p_sales_order_number || ':' || p_idempotency_key, 'Posted',
    (now() at time zone 'Asia/Jakarta')::date,
    (now() at time zone 'Asia/Jakarta')::date + due_days,
    0, 0, 0, 0
  );

  for line_row in
    select sol.id, sol.sku, sol.unit_price, sol.discount_percent,
      (select sum(dnl.quantity) from public.delivery_note_lines dnl where dnl.sales_order_line_id = sol.id)::integer
        - coalesce((select sum(cil.quantity) from public.customer_invoice_lines cil where cil.sales_order_line_id = sol.id), 0)::integer as qty
    from public.sales_order_lines sol
    where sol.sales_order_number = p_sales_order_number
    for update
  loop
    if line_row.qty > 0 then
      line_subtotal := round(line_row.unit_price * line_row.qty * (1 - line_row.discount_percent / 100), 0);
      line_tax := round(line_subtotal * (select rate from public.tax_rates where id = 'PBJT10') / 100, 0);
      insert into public.customer_invoice_lines (
        invoice_number, sales_order_line_id, sku, quantity, unit_price,
        discount_percent, subtotal, tax_amount
      ) values (
        invoice_number, line_row.id, line_row.sku, line_row.qty,
        line_row.unit_price, line_row.discount_percent, line_subtotal, line_tax
      );
      invoice_subtotal := invoice_subtotal + line_subtotal;
      invoice_tax := invoice_tax + line_tax;
    end if;
  end loop;
  update public.customer_invoices set subtotal = invoice_subtotal, tax_total = invoice_tax,
    total = invoice_subtotal + invoice_tax where number = invoice_number;
  perform public.post_business_journal(
    'customer_invoice', invoice_number, 'invoice:' || p_sales_order_number || ':' || p_idempotency_key,
    'Faktur ' || p_sales_order_number,
    jsonb_build_array(
      jsonb_build_object('account_code', '1201', 'debit', invoice_subtotal + invoice_tax, 'credit', 0),
      jsonb_build_object('account_code', '4101', 'debit', 0, 'credit', invoice_subtotal),
      jsonb_build_object('account_code', '2102', 'debit', 0, 'credit', invoice_tax)
    )
  );
  update public.sales_orders set status = 'Invoiced'
    where number = p_sales_order_number
      and not exists (
        select 1 from public.sales_order_lines sol
        where sol.sales_order_number = p_sales_order_number
          and coalesce((select sum(dnl.quantity) from public.delivery_note_lines dnl where dnl.sales_order_line_id = sol.id), 0)
            > coalesce((select sum(cil.quantity) from public.customer_invoice_lines cil where cil.sales_order_line_id = sol.id), 0)
      );
  perform public.write_business_audit('invoice', 'customer_invoice', invoice_number,
    jsonb_build_object('sales_order', p_sales_order_number, 'total', invoice_subtotal + invoice_tax));
  return invoice_number;
end;
$$;

create function public.record_customer_payment(
  p_invoice_number text,
  p_amount numeric,
  p_account_code text,
  p_idempotency_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['finance', 'owner']::public.app_role[]);
  invoice_row public.customer_invoices%rowtype;
  payment_number text;
  payment_journal jsonb;
begin
  if p_amount is null or p_amount <= 0 or p_idempotency_key is null then raise exception 'Pembayaran dan idempotency key wajib'; end if;
  perform public.lock_transaction_key(p_idempotency_key);
  if p_account_code not in ('1101', '1102') then raise exception 'Pembayaran hanya boleh menggunakan Kas atau Bank'; end if;
  select cp.number into payment_number from public.customer_payments cp where cp.idempotency_key = p_idempotency_key;
  if payment_number is not null then
    if not exists (
      select 1 from public.customer_payments cp where cp.number = payment_number
        and cp.invoice_number = p_invoice_number and cp.amount = p_amount
        and cp.account_code = p_account_code
    ) then raise exception 'Idempotency key sudah digunakan untuk pembayaran berbeda'; end if;
    return payment_number;
  end if;
  select * into invoice_row from public.customer_invoices where number = p_invoice_number for update;
  if not found or invoice_row.status <> 'Posted' then raise exception 'Invoice tidak dapat dibayar'; end if;
  if p_amount > invoice_row.total - invoice_row.amount_paid - invoice_row.amount_credited then raise exception 'Pembayaran melebihi sisa invoice'; end if;
  payment_number := 'CP' || lpad(nextval('public.customer_invoice_number_seq')::text, 5, '0');
  insert into public.customer_payments (number, invoice_number, amount, account_code, idempotency_key, created_by)
  values (payment_number, p_invoice_number, p_amount, p_account_code, p_idempotency_key, actor_id);
  update public.customer_invoices set amount_paid = amount_paid + p_amount where number = p_invoice_number;
  payment_journal := jsonb_build_array(
    jsonb_build_object('account_code', p_account_code, 'debit', p_amount, 'credit', 0),
    jsonb_build_object('account_code', '1201', 'debit', 0, 'credit', p_amount)
  );
  perform public.post_business_journal('customer_payment', payment_number, 'customer-payment:' || p_idempotency_key,
    'Pembayaran pelanggan ' || p_invoice_number, payment_journal);
  perform public.write_business_audit('payment', 'customer_payment', payment_number,
    jsonb_build_object('invoice', p_invoice_number, 'amount', p_amount, 'account_code', p_account_code));
  return payment_number;
end;
$$;

create function public.create_purchase_order(
  p_vendor_id text,
  p_sku text,
  p_quantity integer,
  p_idempotency_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['procurement', 'owner']::public.app_role[]);
  price_row public.vendor_pricelist%rowtype;
  po_number text;
  total_amount numeric(14, 2);
begin
  if p_quantity is null or p_quantity <= 0 or p_idempotency_key is null then raise exception 'Kuantitas dan idempotency key wajib'; end if;
  perform public.lock_transaction_key(p_idempotency_key);
  select po.number into po_number from public.purchase_orders po where po.idempotency_key = p_idempotency_key;
  if po_number is not null then
    if not exists (
      select 1 from public.purchase_orders po
      join public.purchase_order_lines pol on pol.purchase_order_number = po.number
      where po.number = po_number and po.vendor_id = p_vendor_id
        and pol.sku = p_sku and pol.quantity = p_quantity
    ) then raise exception 'Idempotency key sudah digunakan untuk Purchase Order berbeda'; end if;
    return po_number;
  end if;
  select * into price_row from public.vendor_pricelist where vendor_id = p_vendor_id and sku = p_sku for update;
  if not found then raise exception 'SKU tidak tersedia pada daftar harga pemasok'; end if;
  if p_quantity < price_row.minimum_quantity then raise exception 'Kuantitas di bawah minimum pembelian'; end if;
  if price_row.purchase_price <= 0 then raise exception 'Harga beli harus lebih besar dari nol'; end if;
  total_amount := p_quantity * price_row.purchase_price;
  po_number := 'PO' || lpad(nextval('public.purchase_order_number_seq')::text, 5, '0');
  insert into public.purchase_orders (number, vendor_id, status, order_date, destination_code, total, locked_at, idempotency_key, request_hash)
  values (po_number, p_vendor_id, 'Purchase Order', (now() at time zone 'Asia/Jakarta')::date, 'WH-TBT', total_amount, now(),
    p_idempotency_key, md5(p_vendor_id || '|' || p_sku || '|' || p_quantity::text));
  insert into public.purchase_order_lines (purchase_order_number, sku, quantity, unit_price, purchase_tax)
  values (po_number, p_sku, p_quantity, price_row.purchase_price, price_row.purchase_tax);
  perform public.write_business_audit('create', 'purchase_order', po_number,
    jsonb_build_object('vendor_id', p_vendor_id, 'sku', p_sku, 'quantity', p_quantity, 'total', total_amount));
  return po_number;
end;
$$;

create function public.receive_purchase_order(
  p_purchase_order_number text,
  p_accepted_quantity integer,
  p_rejected_quantity integer,
  p_idempotency_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['warehouse', 'owner']::public.app_role[]);
  po_row public.purchase_orders%rowtype;
  line_row public.purchase_order_lines%rowtype;
  stock_row public.stock_balances%rowtype;
  receipt_number text;
  accepted_value numeric(14, 2);
begin
  if coalesce(p_accepted_quantity, 0) < 0 or coalesce(p_rejected_quantity, 0) < 0
     or coalesce(p_accepted_quantity, 0) + coalesce(p_rejected_quantity, 0) = 0
     or p_idempotency_key is null then raise exception 'Jumlah accepted/rejected dan idempotency key tidak valid'; end if;
  perform public.lock_transaction_key(p_idempotency_key);
  select gr.number into receipt_number from public.goods_receipts gr where gr.idempotency_key = p_idempotency_key;
  if receipt_number is not null then
    if not exists (
      select 1 from public.goods_receipts gr
      join public.goods_receipt_lines grl on grl.receipt_number = gr.number
      where gr.number = receipt_number and gr.purchase_order_number = p_purchase_order_number
        and grl.accepted_quantity = p_accepted_quantity
        and grl.rejected_quantity = p_rejected_quantity
    ) then raise exception 'Idempotency key sudah digunakan untuk penerimaan berbeda'; end if;
    return receipt_number;
  end if;
  select * into po_row from public.purchase_orders where number = p_purchase_order_number for update;
  if not found or po_row.status not in ('Purchase Order', 'Partial Receipt') then raise exception 'Purchase Order tidak dapat diterima'; end if;
  select * into line_row from public.purchase_order_lines
    where purchase_order_number = p_purchase_order_number for update;
  if line_row.received_quantity + line_row.rejected_quantity + p_accepted_quantity + p_rejected_quantity > line_row.quantity then
    raise exception 'Jumlah penerimaan melebihi sisa kuantitas Purchase Order';
  end if;
  select * into stock_row from public.stock_balances
    where sku = line_row.sku and location_code = po_row.destination_code for update;
  if not found then raise exception 'Saldo lokasi penerimaan tidak ditemukan'; end if;
  receipt_number := 'GR' || lpad(nextval('public.receipt_number_seq')::text, 5, '0');
  insert into public.goods_receipts (number, purchase_order_number, idempotency_key, created_by)
  values (receipt_number, p_purchase_order_number, p_idempotency_key, actor_id);
  insert into public.goods_receipt_lines (
    receipt_number, purchase_order_line_id, sku, accepted_quantity, rejected_quantity
  ) values (
    receipt_number, line_row.id, line_row.sku, p_accepted_quantity, p_rejected_quantity
  );
  update public.purchase_order_lines set
    received_quantity = received_quantity + p_accepted_quantity,
    rejected_quantity = rejected_quantity + p_rejected_quantity
  where id = line_row.id;
  update public.stock_balances set on_hand = on_hand + p_accepted_quantity
    where sku = line_row.sku and location_code = po_row.destination_code;
  accepted_value := p_accepted_quantity * line_row.unit_price;
  if p_accepted_quantity > 0 then
    perform public.post_business_journal(
      'goods_receipt', receipt_number, 'receipt:' || p_idempotency_key,
      'Penerimaan baik ' || p_purchase_order_number,
      jsonb_build_array(
        jsonb_build_object('account_code', '1301', 'debit', accepted_value, 'credit', 0),
        jsonb_build_object('account_code', '2103', 'debit', 0, 'credit', accepted_value)
      )
    );
  end if;
  if line_row.received_quantity + line_row.rejected_quantity + p_accepted_quantity + p_rejected_quantity = line_row.quantity then
    update public.purchase_orders set status = 'Received' where number = p_purchase_order_number;
  else
    update public.purchase_orders set status = 'Partial Receipt' where number = p_purchase_order_number;
  end if;
  perform public.write_business_audit('receive', 'goods_receipt', receipt_number,
    jsonb_build_object('purchase_order', p_purchase_order_number, 'accepted', p_accepted_quantity, 'rejected', p_rejected_quantity));
  return receipt_number;
end;
$$;

create function public.create_vendor_bill(
  p_purchase_order_number text,
  p_idempotency_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['finance', 'owner']::public.app_role[]);
  po_row public.purchase_orders%rowtype;
  line_row public.purchase_order_lines%rowtype;
  bill_number text;
  bill_quantity integer;
  bill_amount numeric(14, 2);
  due_days integer;
begin
  if p_idempotency_key is null then raise exception 'Idempotency key wajib'; end if;
  perform public.lock_transaction_key(p_idempotency_key);
  select vb.number into bill_number from public.vendor_bills vb
    where vb.source_document = p_purchase_order_number || ':' || p_idempotency_key;
  if bill_number is not null then return bill_number; end if;
  select * into po_row from public.purchase_orders where number = p_purchase_order_number for update;
  if not found then raise exception 'Purchase Order tidak ditemukan'; end if;
  select * into line_row from public.purchase_order_lines
    where purchase_order_number = p_purchase_order_number for update;
  bill_quantity := line_row.received_quantity - line_row.billed_quantity;
  if bill_quantity <= 0 then raise exception 'Tidak ada barang diterima-baik yang belum ditagih'; end if;
  select pt.days into due_days from public.vendors v
    join public.payment_terms pt on pt.code = v.payment_terms_code where v.id = po_row.vendor_id;
  bill_amount := bill_quantity * line_row.unit_price;
  bill_number := 'BILL' || lpad(nextval('public.vendor_bill_number_seq')::text, 5, '0');
  insert into public.vendor_bills (
    number, vendor_id, source_document, status, issue_date, due_date,
    subtotal, tax_total, total, amount_paid
  ) values (
    bill_number, po_row.vendor_id, p_purchase_order_number || ':' || p_idempotency_key,
    'Posted', (now() at time zone 'Asia/Jakarta')::date,
    (now() at time zone 'Asia/Jakarta')::date + due_days, bill_amount, 0, bill_amount, 0
  );
  insert into public.vendor_bill_lines (bill_number, purchase_order_line_id, sku, quantity, unit_price, subtotal)
  values (bill_number, line_row.id, line_row.sku, bill_quantity, line_row.unit_price, bill_amount);
  update public.purchase_order_lines set billed_quantity = billed_quantity + bill_quantity where id = line_row.id;
  perform public.post_business_journal(
    'vendor_bill', bill_number, 'vendor-bill:' || p_purchase_order_number || ':' || p_idempotency_key,
    'Tagihan pemasok ' || p_purchase_order_number,
    jsonb_build_array(
      jsonb_build_object('account_code', '2103', 'debit', bill_amount, 'credit', 0),
      jsonb_build_object('account_code', '2101', 'debit', 0, 'credit', bill_amount)
    )
  );
  perform public.write_business_audit('bill', 'vendor_bill', bill_number,
    jsonb_build_object('purchase_order', p_purchase_order_number, 'quantity', bill_quantity, 'total', bill_amount));
  return bill_number;
end;
$$;

create function public.record_vendor_payment(
  p_bill_number text,
  p_amount numeric,
  p_account_code text,
  p_idempotency_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['finance', 'owner']::public.app_role[]);
  bill_row public.vendor_bills%rowtype;
  payment_number text;
begin
  if p_amount is null or p_amount <= 0 or p_idempotency_key is null then raise exception 'Pembayaran dan idempotency key wajib'; end if;
  perform public.lock_transaction_key(p_idempotency_key);
  if p_account_code not in ('1101', '1102') then raise exception 'Pembayaran hanya boleh menggunakan Kas atau Bank'; end if;
  select vp.number into payment_number from public.vendor_payments vp where vp.idempotency_key = p_idempotency_key;
  if payment_number is not null then
    if not exists (
      select 1 from public.vendor_payments vp where vp.number = payment_number
        and vp.bill_number = p_bill_number and vp.amount = p_amount
        and vp.account_code = p_account_code
    ) then raise exception 'Idempotency key sudah digunakan untuk pembayaran berbeda'; end if;
    return payment_number;
  end if;
  select * into bill_row from public.vendor_bills where number = p_bill_number for update;
  if not found or bill_row.status <> 'Posted' then raise exception 'Vendor Bill tidak dapat dibayar'; end if;
  if p_amount > bill_row.total - bill_row.amount_paid then raise exception 'Pembayaran melebihi saldo Vendor Bill'; end if;
  payment_number := 'VP' || lpad(nextval('public.vendor_bill_number_seq')::text, 5, '0');
  insert into public.vendor_payments (number, bill_number, amount, account_code, idempotency_key, created_by)
  values (payment_number, p_bill_number, p_amount, p_account_code, p_idempotency_key, actor_id);
  update public.vendor_bills set amount_paid = amount_paid + p_amount where number = p_bill_number;
  perform public.post_business_journal(
    'vendor_payment', payment_number, 'vendor-payment:' || p_idempotency_key,
    'Pembayaran pemasok ' || p_bill_number,
    jsonb_build_array(
      jsonb_build_object('account_code', '2101', 'debit', p_amount, 'credit', 0),
      jsonb_build_object('account_code', p_account_code, 'debit', 0, 'credit', p_amount)
    )
  );
  perform public.write_business_audit('payment', 'vendor_payment', payment_number,
    jsonb_build_object('bill', p_bill_number, 'amount', p_amount, 'account_code', p_account_code));
  return payment_number;
end;
$$;

create function public.transfer_inventory(
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

create function public.open_pos_session(
  p_opening_cash numeric,
  p_idempotency_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['cashier', 'owner']::public.app_role[]);
  profile_name text;
  session_number text;
  configuration public.pos_configuration%rowtype;
begin
  if p_opening_cash is null or p_opening_cash < 0 or p_idempotency_key is null then raise exception 'Kas awal dan idempotency key tidak valid'; end if;
  perform public.lock_transaction_key(p_idempotency_key);
  select ps.number into session_number from public.pos_sessions ps where ps.idempotency_key = p_idempotency_key;
  if session_number is not null then
    if not exists (
      select 1 from public.pos_sessions ps where ps.number = session_number
        and ps.opened_by = actor_id and ps.opening_cash = p_opening_cash
    ) then raise exception 'Idempotency key sudah digunakan untuk sesi POS berbeda'; end if;
    return session_number;
  end if;
  if exists (select 1 from public.pos_sessions ps where ps.opened_by = actor_id and ps.status in ('Open', 'Pending Approval')) then
    raise exception 'Kasir sudah memiliki sesi POS yang belum ditutup';
  end if;
  select * into configuration from public.pos_configuration where id = 'POS-TBT';
  if not found then raise exception 'Konfigurasi POS tidak ditemukan'; end if;
  if p_opening_cash <> configuration.opening_cash then raise exception 'Kas awal POS harus sesuai konfigurasi'; end if;
  select full_name into profile_name from public.profiles where id = actor_id;
  session_number := 'POS/' || lpad(nextval('public.pos_session_number_seq')::text, 5, '0');
  insert into public.pos_sessions (number, cashier_label, status, opening_cash, opened_at, opened_by, idempotency_key)
  values (session_number, profile_name, 'Open', p_opening_cash, now(), actor_id, p_idempotency_key);
  perform public.write_business_audit('open', 'pos_session', session_number, jsonb_build_object('opening_cash', p_opening_cash));
  return session_number;
end;
$$;

create function public.create_pos_sale(
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

create function public.close_pos_session(
  p_session_number text,
  p_counted_cash numeric,
  p_variance_reason text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['cashier', 'owner']::public.app_role[]);
  session_row public.pos_sessions%rowtype;
  variance numeric(14, 2);
begin
  select * into session_row from public.pos_sessions
    where number = p_session_number and opened_by = actor_id for update;
  if not found or session_row.status <> 'Open' then raise exception 'Sesi POS tidak dapat ditutup oleh pengguna ini'; end if;
  if p_counted_cash is null or p_counted_cash < 0 then raise exception 'Kas terhitung tidak valid'; end if;
  variance := p_counted_cash - coalesce(session_row.expected_cash, session_row.opening_cash);
  if variance <> 0 and nullif(trim(p_variance_reason), '') is null then raise exception 'Alasan wajib untuk selisih kas'; end if;
  update public.pos_sessions set
    counted_cash = p_counted_cash,
    cash_difference = variance,
    variance_reason = p_variance_reason,
    status = case when variance = 0 or public.has_app_role(array['owner']::public.app_role[]) then 'Closed' else 'Pending Approval' end,
    closed_at = case when variance = 0 or public.has_app_role(array['owner']::public.app_role[]) then now() else null end,
    approved_by = case when variance <> 0 and public.has_app_role(array['owner']::public.app_role[]) then actor_id else null end
  where number = p_session_number;
  perform public.write_business_audit('close', 'pos_session', p_session_number,
    jsonb_build_object('counted_cash', p_counted_cash, 'difference', variance, 'reason', p_variance_reason));
  return p_session_number;
end;
$$;

create function public.approve_pos_session_variance(p_session_number text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['owner']::public.app_role[]);
begin
  update public.pos_sessions set status = 'Closed', closed_at = now(), approved_by = actor_id
    where number = p_session_number and status = 'Pending Approval' and variance_reason is not null;
  if not found then raise exception 'Sesi dengan selisih yang menunggu persetujuan tidak ditemukan'; end if;
  perform public.write_business_audit('approve_variance', 'pos_session', p_session_number);
  return p_session_number;
end;
$$;

create function public.create_customer_credit_note(
  p_invoice_number text,
  p_sku text,
  p_quantity integer,
  p_item_condition text,
  p_idempotency_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['sales', 'finance', 'owner']::public.app_role[]);
  invoice_row public.customer_invoices%rowtype;
  invoice_line public.customer_invoice_lines%rowtype;
  product_cost numeric(14, 2);
  credit_number text;
  returned_quantity integer;
  credit_subtotal numeric(14, 2);
  credit_tax numeric(14, 2);
  credit_total numeric(14, 2);
  credit_cogs numeric(14, 2);
begin
  if p_quantity is null or p_quantity <= 0 or p_idempotency_key is null then raise exception 'Kuantitas dan idempotency key wajib'; end if;
  if p_item_condition not in ('sealed', 'damaged') then raise exception 'Kondisi barang harus sealed atau damaged'; end if;
  perform public.lock_transaction_key(p_idempotency_key);
  select cn.number into credit_number from public.credit_notes cn where cn.idempotency_key = p_idempotency_key;
  if credit_number is not null then
    if not exists (
      select 1 from public.credit_notes cn
      join public.credit_note_lines cnl on cnl.credit_note_number = cn.number
      where cn.number = credit_number and cn.invoice_number = p_invoice_number
        and cnl.sku = p_sku and cnl.quantity = p_quantity
        and cnl.item_condition = p_item_condition
    ) then raise exception 'Idempotency key sudah digunakan untuk Credit Note berbeda'; end if;
    return credit_number;
  end if;
  select * into invoice_row from public.customer_invoices where number = p_invoice_number for update;
  if not found or invoice_row.status <> 'Posted' then raise exception 'Invoice tidak dapat diretur'; end if;
  select * into invoice_line from public.customer_invoice_lines
    where invoice_number = p_invoice_number and sku = p_sku for update;
  if not found then raise exception 'SKU tidak terdapat pada invoice'; end if;
  select coalesce(sum(cnl.quantity), 0)::integer into returned_quantity
    from public.credit_note_lines cnl where cnl.invoice_line_id = invoice_line.id;
  if returned_quantity + p_quantity > invoice_line.quantity then raise exception 'Retur melebihi kuantitas yang ditagih'; end if;
  credit_subtotal := round(invoice_line.subtotal * p_quantity / invoice_line.quantity, 0);
  credit_tax := round(invoice_line.tax_amount * p_quantity / invoice_line.quantity, 0);
  credit_total := credit_subtotal + credit_tax;
  if credit_total > invoice_row.total - invoice_row.amount_paid - invoice_row.amount_credited then
    raise exception 'Credit Note melebihi piutang tersisa; refund tunai tidak diaktifkan';
  end if;
  credit_number := 'CN' || lpad(nextval('public.credit_note_number_seq')::text, 5, '0');
  insert into public.credit_notes (number, invoice_number, idempotency_key, subtotal, tax_amount, total, created_by)
  values (credit_number, p_invoice_number, p_idempotency_key, credit_subtotal, credit_tax, credit_total, actor_id);
  insert into public.credit_note_lines (
    credit_note_number, invoice_line_id, sku, quantity, item_condition, subtotal, tax_amount
  ) values (
    credit_number, invoice_line.id, p_sku, p_quantity, p_item_condition, credit_subtotal, credit_tax
  );
  update public.customer_invoices set amount_credited = amount_credited + credit_total where number = p_invoice_number;
  if p_item_condition = 'sealed' then
    update public.stock_balances set on_hand = on_hand + p_quantity
      where sku = p_sku and location_code = 'WH-TBT';
    select standard_cost * p_quantity into product_cost from public.product_costs where sku = p_sku;
  else
    product_cost := 0;
  end if;
  perform public.post_business_journal(
    'credit_note', credit_number, 'credit-note:' || p_idempotency_key,
    'Retur pelanggan ' || p_invoice_number,
    jsonb_build_array(
      jsonb_build_object('account_code', '4101', 'debit', credit_subtotal, 'credit', 0),
      jsonb_build_object('account_code', '2102', 'debit', credit_tax, 'credit', 0),
      jsonb_build_object('account_code', '1201', 'debit', 0, 'credit', credit_total),
      jsonb_build_object('account_code', '1301', 'debit', product_cost, 'credit', 0),
      jsonb_build_object('account_code', '5101', 'debit', 0, 'credit', product_cost)
    )
  );
  perform public.write_business_audit('credit_note', 'credit_note', credit_number,
    jsonb_build_object('invoice', p_invoice_number, 'sku', p_sku, 'quantity', p_quantity, 'condition', p_item_condition, 'total', credit_total));
  return credit_number;
end;
$$;

create function public.update_lead_stage(
  p_lead_number text,
  p_stage text,
  p_lost_reason text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['sales', 'owner']::public.app_role[]);
begin
  if p_stage not in ('New', 'Qualified', 'Proposition', 'Won', 'Lost') then raise exception 'Tahap lead tidak valid'; end if;
  if p_stage = 'Lost' and nullif(trim(p_lost_reason), '') is null then raise exception 'Alasan wajib untuk lead Lost'; end if;
  update public.leads set stage = p_stage, lost_reason = case when p_stage = 'Lost' then trim(p_lost_reason) else null end
    where number = p_lead_number;
  if not found then raise exception 'Lead tidak ditemukan'; end if;
  perform public.write_business_audit('update_stage', 'lead', p_lead_number,
    jsonb_build_object('stage', p_stage, 'lost_reason', p_lost_reason));
  return p_lead_number;
end;
$$;

create function public.create_lead(
  p_customer_id text,
  p_sku text,
  p_quantity integer,
  p_probability numeric,
  p_idempotency_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['sales', 'owner']::public.app_role[]);
  lead_number text;
  product_price numeric(14, 2);
begin
  if p_quantity is null or p_quantity <= 0 or p_probability < 0 or p_probability > 100 or p_idempotency_key is null then
    raise exception 'Kuantitas, probabilitas, dan idempotency key tidak valid';
  end if;
  perform public.lock_transaction_key(p_idempotency_key);
  if not exists (select 1 from public.customers where id = p_customer_id) then raise exception 'Pelanggan tidak ditemukan'; end if;
  select sales_price into product_price from public.products where sku = p_sku;
  if not found then raise exception 'SKU tidak ditemukan'; end if;
  if product_price <= 0 then raise exception 'Harga jual harus lebih besar dari nol'; end if;
  select l.number into lead_number from public.leads l where l.idempotency_key = p_idempotency_key;
  if lead_number is not null then
    if not exists (
      select 1 from public.leads l where l.number = lead_number
        and l.customer_id = p_customer_id and l.sku = p_sku
        and l.quantity = p_quantity and l.probability_percent = p_probability
    ) then raise exception 'Idempotency key sudah digunakan untuk lead berbeda'; end if;
    return lead_number;
  end if;
  lead_number := 'L' || lpad(nextval('public.lead_number_seq')::text, 5, '0');
  insert into public.leads (number, customer_id, sku, quantity, stage, expected_revenue, probability_percent, idempotency_key)
  values (lead_number, p_customer_id, p_sku, p_quantity, 'New', p_quantity * product_price, p_probability, p_idempotency_key);
  perform public.write_business_audit('create', 'lead', lead_number,
    jsonb_build_object('customer_id', p_customer_id, 'sku', p_sku, 'quantity', p_quantity));
  return lead_number;
end;
$$;

create function public.get_owner_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  perform public.require_transaction_role(array['owner', 'finance']::public.app_role[]);
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

revoke all on function public.create_sales_order(text, text, integer, numeric, text, text) from public, anon;
revoke all on function public.deliver_sales_order(text, integer, text) from public, anon;
revoke all on function public.invoice_delivered_sales_order(text, text) from public, anon;
revoke all on function public.record_customer_payment(text, numeric, text, text) from public, anon;
revoke all on function public.create_purchase_order(text, text, integer, text) from public, anon;
revoke all on function public.receive_purchase_order(text, integer, integer, text) from public, anon;
revoke all on function public.create_vendor_bill(text, text) from public, anon;
revoke all on function public.record_vendor_payment(text, numeric, text, text) from public, anon;
revoke all on function public.transfer_inventory(text, text, text, integer, text) from public, anon;
revoke all on function public.open_pos_session(numeric, text) from public, anon;
revoke all on function public.create_pos_sale(text, integer, text, text) from public, anon;
revoke all on function public.close_pos_session(text, numeric, text) from public, anon;
revoke all on function public.approve_pos_session_variance(text) from public, anon;
revoke all on function public.create_customer_credit_note(text, text, integer, text, text) from public, anon;
revoke all on function public.update_lead_stage(text, text, text) from public, anon;
revoke all on function public.create_lead(text, text, integer, numeric, text) from public, anon;
revoke all on function public.get_owner_dashboard() from public, anon;

grant execute on function public.create_sales_order(text, text, integer, numeric, text, text) to authenticated;
grant execute on function public.deliver_sales_order(text, integer, text) to authenticated;
grant execute on function public.invoice_delivered_sales_order(text, text) to authenticated;
grant execute on function public.record_customer_payment(text, numeric, text, text) to authenticated;
grant execute on function public.create_purchase_order(text, text, integer, text) to authenticated;
grant execute on function public.receive_purchase_order(text, integer, integer, text) to authenticated;
grant execute on function public.create_vendor_bill(text, text) to authenticated;
grant execute on function public.record_vendor_payment(text, numeric, text, text) to authenticated;
grant execute on function public.transfer_inventory(text, text, text, integer, text) to authenticated;
grant execute on function public.open_pos_session(numeric, text) to authenticated;
grant execute on function public.create_pos_sale(text, integer, text, text) to authenticated;
grant execute on function public.close_pos_session(text, numeric, text) to authenticated;
grant execute on function public.approve_pos_session_variance(text) to authenticated;
grant execute on function public.create_customer_credit_note(text, text, integer, text, text) to authenticated;
grant execute on function public.update_lead_stage(text, text, text) to authenticated;
grant execute on function public.create_lead(text, text, integer, numeric, text) to authenticated;
grant execute on function public.get_owner_dashboard() to authenticated;


-- MIGRATION: 202611050003_pos_workflows.sql
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
select 'MIXED', 'Cash + Bank', '1101', 'Split tender'
where exists(select 1 from public.chart_of_accounts where code='1101')
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


-- MIGRATION: 202611050004_pos_hold_max_ten_minutes.sql
-- Limit new POS holds to the maximum duration required by the scenario.
-- Existing rows remain valid; duration changes and new rows are guarded.
create function public.enforce_pos_hold_duration_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.expires_in_minutes is null or new.expires_in_minutes not between 1 and 10 then
      raise exception 'Masa hold POS harus antara 1 dan 10 menit';
    end if;
  elsif new.expires_in_minutes is distinct from old.expires_in_minutes
     and (new.expires_in_minutes is null or new.expires_in_minutes not between 1 and 10) then
    raise exception 'Masa hold POS harus antara 1 dan 10 menit';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_pos_hold_duration_limit() from public, anon, authenticated;

create trigger pos_hold_duration_limit
before insert or update on public.pos_holds
for each row execute function public.enforce_pos_hold_duration_limit();


-- MIGRATION: 202611050005_pos_customer_link.sql
alter table public.pos_receipts
  add column customer_id text references public.customers (id);

create index pos_receipts_customer_idx
  on public.pos_receipts (customer_id, sold_at desc)
  where customer_id is not null;

create function public.create_pos_sale_for_customer(
  p_sku text,
  p_quantity integer,
  p_payment_method text,
  p_idempotency_key text,
  p_customer_id text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['cashier', 'owner']::public.app_role[]);
  receipt_number text;
  existing_customer_id text;
  updated_rows integer;
begin
  if p_customer_id is not null and not exists (
    select 1 from public.customers where id = p_customer_id
  ) then
    raise exception 'Pelanggan POS tidak ditemukan';
  end if;

  receipt_number := public.create_pos_sale(
    p_sku, p_quantity, p_payment_method, p_idempotency_key
  );
  if p_customer_id is null then
    select customer_id into existing_customer_id
    from public.pos_receipts
    where number = receipt_number and created_by = actor_id;
    if not found or existing_customer_id is not null then
      raise exception 'Idempotency key sudah digunakan untuk transaksi POS dengan pelanggan berbeda';
    end if;
    return receipt_number;
  end if;

  update public.pos_receipts
  set customer_id = p_customer_id
  where number = receipt_number
    and created_by = actor_id
    and (customer_id is null or customer_id = p_customer_id);
  get diagnostics updated_rows = row_count;
  if updated_rows <> 1 then
    raise exception 'Idempotency key sudah digunakan untuk pelanggan POS berbeda';
  end if;

  return receipt_number;
end;
$$;

revoke all on function public.create_pos_sale_for_customer(text, integer, text, text, text) from public, anon;
grant execute on function public.create_pos_sale_for_customer(text, integer, text, text, text) to authenticated;


-- MIGRATION: 202611060006_credit_note_role_boundary.sql
-- Tighten financial Credit Note posting without changing transaction data.
-- Safe to rerun: fails closed if the expected guard cannot be identified.
do $migration$
declare
  definition text;
  old_guard text := $guard$public.require_transaction_role(array['sales', 'finance', 'owner']::public.app_role[])$guard$;
  new_guard text := $guard$public.require_transaction_role(array['finance', 'owner']::public.app_role[])$guard$;
begin
  select pg_get_functiondef('public.create_customer_credit_note(text,text,integer,text,text)'::regprocedure) into definition;
  if strpos(definition, old_guard) > 0 then
    execute replace(definition, old_guard, new_guard);
  elsif strpos(definition, new_guard) = 0 then
    raise exception 'Unrecognized Credit Note role guard; no change applied';
  end if;
end;
$migration$;


-- MIGRATION: 202611060007_fix_cp00004_payment_nominal.sql
-- Retired before deployment: never infer a payment from an invoice's total.
-- CP00004 is recorded as Rp330. Whether Rp330 or Rp330000 was intended
-- requires confirmation. Posted payments and journals must retain their history.
-- Any confirmed correction needs a separately reviewed, auditable transaction.
select '007 retired: no historical payment or journal changed' as migration_note;


-- MIGRATION: 202611060008_fix_complete_pos_hold_tender_record.sql
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
  if nullif(trim(p_hold_number), '') is null or p_idempotency_key is null
     or length(trim(p_idempotency_key)) < 8 or p_tenders is null
     or jsonb_typeof(p_tenders) <> 'array' or jsonb_array_length(p_tenders) = 0 then
    raise exception 'Hold, tender, dan idempotency key wajib diisi';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_tenders) as requested_tender(payment_method text, amount numeric)
    where requested_tender.payment_method is null
      or requested_tender.payment_method not in ('CASH', 'BANK')
      or requested_tender.amount is null or requested_tender.amount <= 0
      or requested_tender.amount::text in ('NaN', 'Infinity', '-Infinity')
      or requested_tender.amount <> trunc(requested_tender.amount)
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
    if exists (
      (select requested_tender.payment_method, requested_tender.amount
       from jsonb_to_recordset(p_tenders) as requested_tender(payment_method text, amount numeric)
       except select t.payment_method, t.amount from public.pos_receipt_tenders t
       where t.receipt_number = (select pr.number from public.pos_receipts pr where pr.idempotency_key = p_idempotency_key))
      union all
      (select t.payment_method, t.amount from public.pos_receipt_tenders t
       where t.receipt_number = (select pr.number from public.pos_receipts pr where pr.idempotency_key = p_idempotency_key)
       except select requested_tender.payment_method, requested_tender.amount
       from jsonb_to_recordset(p_tenders) as requested_tender(payment_method text, amount numeric))
    ) then raise exception 'Idempotency key sudah digunakan dengan tender berbeda'; end if;
    return receipt_number;
  end if;
  perform public.expire_pos_holds();
  select * into hold_row from public.pos_holds where number = p_hold_number for update;
  if not found or hold_row.status <> 'Open' or hold_row.expires_at <= now() then
    raise exception 'Hold POS tidak aktif atau sudah kedaluwarsa';
  end if;
  if hold_row.created_by <> actor_id then raise exception 'Hold POS bukan milik sesi kasir ini'; end if;
  perform 1 from public.pos_sessions ps
    where ps.number = hold_row.session_number and ps.opened_by = actor_id
      and ps.status = 'Open' for update;
  if not found then raise exception 'Sesi POS sudah ditutup atau bukan milik kasir ini'; end if;
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



-- MIGRATION: 202611060009_pos_single_payment_details.sql
-- Direct single-SKU Cash/Bank sales predate the normalized receipt tables.
-- Populate their details atomically; hold checkout already writes its own lines.
create or replace function public.fill_direct_pos_receipt_details()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.hold_number is null and new.payment_method in ('CASH', 'BANK') then
    insert into public.pos_receipt_lines(receipt_number,sku,quantity,unit_price,subtotal,tax_amount)
    values(new.number,new.sku,new.quantity,new.subtotal/new.quantity,new.subtotal,new.tax_amount);
    insert into public.pos_receipt_tenders(receipt_number,payment_method,amount)
    values(new.number,new.payment_method,new.total);
  end if;
  return new;
end;
$$;
revoke all on function public.fill_direct_pos_receipt_details() from public,anon,authenticated;
drop trigger if exists direct_pos_receipt_details on public.pos_receipts;
create trigger direct_pos_receipt_details after insert on public.pos_receipts
for each row execute function public.fill_direct_pos_receipt_details();

-- Backfill only where the posted journal independently confirms the receipt.
-- No amounts, stock, session balances, expiry times or posted journals change.
do $repair$
declare r record; inserted_count integer; changed boolean;
begin
  for r in select pr.* from public.pos_receipts pr
    where pr.hold_number is null and pr.payment_method in ('CASH','BANK')
      and (not exists(select 1 from public.pos_receipt_lines l where l.receipt_number=pr.number)
        or not exists(select 1 from public.pos_receipt_tenders t where t.receipt_number=pr.number))
    for update
  loop
    if r.subtotal+r.tax_amount<>r.total or r.quantity<=0 then
      raise exception 'Legacy receipt % has inconsistent totals',r.number;
    end if;
    if (select count(*) from public.journal_entries je where je.source_type='pos_sale'
      and je.source_reference=r.number and je.status='posted')<>1 then
      raise exception 'Legacy receipt % requires one posted journal',r.number;
    end if;
    if not exists(
      select 1 from public.journal_entries je join public.journal_lines jl on jl.journal_entry_id=je.id
      where je.source_type='pos_sale' and je.source_reference=r.number and je.status='posted'
      group by je.id having sum(jl.debit)=sum(jl.credit)
        and coalesce(sum(jl.debit-jl.credit) filter(where jl.account_code=case when r.payment_method='CASH' then '1101' else '1102' end),0)=r.total
        and coalesce(sum(jl.debit-jl.credit) filter(where jl.account_code=case when r.payment_method='CASH' then '1102' else '1101' end),0)=0
        and coalesce(sum(jl.credit-jl.debit) filter(where jl.account_code='4101'),0)=r.subtotal
        and coalesce(sum(jl.credit-jl.debit) filter(where jl.account_code='2102'),0)=r.tax_amount
    ) then raise exception 'Legacy receipt % does not match posted ledger',r.number; end if;
    changed:=false;
    insert into public.pos_receipt_lines(receipt_number,sku,quantity,unit_price,subtotal,tax_amount)
    select r.number,r.sku,r.quantity,r.subtotal/r.quantity,r.subtotal,r.tax_amount
    where not exists(select 1 from public.pos_receipt_lines l where l.receipt_number=r.number);
    get diagnostics inserted_count=row_count;
    changed:=inserted_count>0;
    insert into public.pos_receipt_tenders(receipt_number,payment_method,amount)
    select r.number,r.payment_method,r.total
    where not exists(select 1 from public.pos_receipt_tenders t where t.receipt_number=r.number);
    get diagnostics inserted_count=row_count;
    if changed or inserted_count>0 then
      insert into public.audit_events(actor_id,actor_label,action,document_type,document_number,details)
      values(auth.uid(),'Perbaikan data legacy POS (migrasi 009)','repair_receipt_details','pos_receipt',r.number,
        jsonb_build_object('migration','009','basis','Receipt snapshot verified against posted ledger',
          'financial_amounts_changed',false,'stock_changed',false,'hold_status_changed',false));
    end if;
  end loop;
end;
$repair$;


-- MIGRATION: 202611070010_keep_partially_delivered_orders_open.sql
-- Keep remaining goods deliverable after invoicing a partial delivery.

create or replace function public.invoice_delivered_sales_order(
  p_sales_order_number text,
  p_idempotency_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['finance', 'owner']::public.app_role[]);
  order_row public.sales_orders%rowtype;
  line_row record;
  invoice_number text;
  existing_number text;
  invoice_subtotal numeric(14, 2) := 0;
  invoice_tax numeric(14, 2) := 0;
  line_subtotal numeric(14, 2);
  line_tax numeric(14, 2);
  delivered_qty integer := 0;
  invoiced_qty integer;
  due_days integer;
begin
  if p_idempotency_key is null then raise exception 'Idempotency key wajib'; end if;
  perform public.lock_transaction_key(p_idempotency_key);
  select ci.number into existing_number from public.customer_invoices ci
    where ci.source_document = p_sales_order_number || ':' || p_idempotency_key;
  if existing_number is not null then return existing_number; end if;
  select * into order_row from public.sales_orders where number = p_sales_order_number for update;
  if not found then raise exception 'Sales Order tidak ditemukan'; end if;
  select pt.days into due_days
    from public.customers c join public.payment_terms pt on pt.code = c.payment_terms_code
    where c.id = order_row.customer_id;

  for line_row in
    select sol.id, sol.sku, sol.quantity, sol.unit_price, sol.discount_percent,
      coalesce((select sum(dnl.quantity) from public.delivery_note_lines dnl where dnl.sales_order_line_id = sol.id), 0)::integer as delivered,
      coalesce((select sum(cil.quantity) from public.customer_invoice_lines cil where cil.sales_order_line_id = sol.id), 0)::integer as invoiced
    from public.sales_order_lines sol
    where sol.sales_order_number = p_sales_order_number
    for update
  loop
    delivered_qty := delivered_qty + line_row.delivered - line_row.invoiced;
  end loop;
  if coalesce(delivered_qty, 0) <= 0 then raise exception 'Tidak ada kuantitas Delivered yang belum ditagih'; end if;

  invoice_number := 'INV' || lpad(nextval('public.customer_invoice_number_seq')::text, 5, '0');
  insert into public.customer_invoices (
    number, customer_id, source_document, status, issue_date, due_date,
    subtotal, tax_total, total, amount_paid
  ) values (
    invoice_number, order_row.customer_id,
    p_sales_order_number || ':' || p_idempotency_key, 'Posted',
    (now() at time zone 'Asia/Jakarta')::date,
    (now() at time zone 'Asia/Jakarta')::date + due_days,
    0, 0, 0, 0
  );

  for line_row in
    select sol.id, sol.sku, sol.unit_price, sol.discount_percent,
      (select sum(dnl.quantity) from public.delivery_note_lines dnl where dnl.sales_order_line_id = sol.id)::integer
        - coalesce((select sum(cil.quantity) from public.customer_invoice_lines cil where cil.sales_order_line_id = sol.id), 0)::integer as qty
    from public.sales_order_lines sol
    where sol.sales_order_number = p_sales_order_number
    for update
  loop
    if line_row.qty > 0 then
      line_subtotal := round(line_row.unit_price * line_row.qty * (1 - line_row.discount_percent / 100), 0);
      line_tax := round(line_subtotal * (select rate from public.tax_rates where id = 'PBJT10') / 100, 0);
      insert into public.customer_invoice_lines (
        invoice_number, sales_order_line_id, sku, quantity, unit_price,
        discount_percent, subtotal, tax_amount
      ) values (
        invoice_number, line_row.id, line_row.sku, line_row.qty,
        line_row.unit_price, line_row.discount_percent, line_subtotal, line_tax
      );
      invoice_subtotal := invoice_subtotal + line_subtotal;
      invoice_tax := invoice_tax + line_tax;
    end if;
  end loop;
  update public.customer_invoices set subtotal = invoice_subtotal, tax_total = invoice_tax,
    total = invoice_subtotal + invoice_tax where number = invoice_number;
  perform public.post_business_journal(
    'customer_invoice', invoice_number, 'invoice:' || p_sales_order_number || ':' || p_idempotency_key,
    'Faktur ' || p_sales_order_number,
    jsonb_build_array(
      jsonb_build_object('account_code', '1201', 'debit', invoice_subtotal + invoice_tax, 'credit', 0),
      jsonb_build_object('account_code', '4101', 'debit', 0, 'credit', invoice_subtotal),
      jsonb_build_object('account_code', '2102', 'debit', 0, 'credit', invoice_tax)
    )
  );
  update public.sales_orders set status = case when exists (
      select 1 from public.sales_order_lines pending
      where pending.sales_order_number = p_sales_order_number
        and pending.quantity > coalesce((select sum(done.quantity) from public.delivery_note_lines done where done.sales_order_line_id = pending.id),0)
    ) then 'Partial Delivery' else 'Invoiced' end
    where number = p_sales_order_number
      and not exists (
        select 1 from public.sales_order_lines sol
        where sol.sales_order_number = p_sales_order_number
          and coalesce((select sum(dnl.quantity) from public.delivery_note_lines dnl where dnl.sales_order_line_id = sol.id), 0)
            > coalesce((select sum(cil.quantity) from public.customer_invoice_lines cil where cil.sales_order_line_id = sol.id), 0)
      );
  perform public.write_business_audit('invoice', 'customer_invoice', invoice_number,
    jsonb_build_object('sales_order', p_sales_order_number, 'total', invoice_subtotal + invoice_tax));
  return invoice_number;
end;
$$;
revoke all on function public.invoice_delivered_sales_order(text,text) from public,anon;
grant execute on function public.invoice_delivered_sales_order(text,text) to authenticated;

-- Only document status is corrected; financial history and quantities remain intact.
with changed as (
 update public.sales_orders so set status='Partial Delivery'
 where so.status='Invoiced' and exists (
  select 1 from public.sales_order_lines sol where sol.sales_order_number=so.number
   and sol.quantity>coalesce((select sum(d.quantity) from public.delivery_note_lines d where d.sales_order_line_id=sol.id),0)
 ) returning number
)
insert into public.audit_events(actor_label,action,document_type,document_number,details)
select 'Perbaikan status pengiriman bertahap','restore_partial_delivery_status','sales_order',number,
 jsonb_build_object('old_status','Invoiced','new_status','Partial Delivery','financial_values_changed',false)
from changed;
notify pgrst,'reload schema';




-- MIGRATION: 202611070011_require_split_tenders_for_mixed_pos.sql
-- Mixed payment requires explicit, reconciled tender lines via checkout hold.

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




-- MIGRATION: 202611070012_automatic_pos_hold_expiry.sql
-- Expiry is enforced immediately in availability and stock operations; cron persists expiry/audit each minute.

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




-- MIGRATION: 202611070013_pos_hold_customer.sql

alter table public.pos_holds add column customer_id text references public.customers(id);

create function public.create_pos_hold_for_customer(p_lines jsonb,p_expires_in_minutes integer,p_idempotency_key text,p_customer_id text default null)
returns text language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_transaction_role(array['cashier','owner']::public.app_role[]); prior public.pos_holds%rowtype; hold_number text;
begin
  if p_customer_id is not null and not exists(select 1 from public.customers where id=p_customer_id) then raise exception 'Customer tidak ditemukan'; end if;
  perform public.lock_transaction_key(p_idempotency_key);
  select * into prior from public.pos_holds where idempotency_key=p_idempotency_key;
  if found and (prior.created_by<>actor or prior.customer_id is distinct from p_customer_id) then raise exception 'Customer atau pelaku berbeda untuk Hold yang sama'; end if;
  hold_number:=public.create_pos_hold(p_lines,p_expires_in_minutes,p_idempotency_key);
  if prior.number is null then
    update public.pos_holds set customer_id=p_customer_id where number=hold_number;
    if p_customer_id is not null then perform public.write_business_audit('link_customer','pos_hold',hold_number,jsonb_build_object('customer_id',p_customer_id)); end if;
  end if;
  return hold_number;
end; $$;
revoke all on function public.create_pos_hold_for_customer(jsonb,integer,text,text) from public,anon;
grant execute on function public.create_pos_hold_for_customer(jsonb,integer,text,text) to authenticated;

create or replace function public.create_pos_hold(
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
  new_hold_number text;
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
  select ph.number into new_hold_number from public.pos_holds ph where ph.idempotency_key = p_idempotency_key;
  if new_hold_number is not null then
    select jsonb_agg(jsonb_build_object('sku', phl.sku, 'quantity', phl.quantity) order by phl.sku)
      into existing_lines from public.pos_hold_lines phl where phl.hold_number = new_hold_number;
    select jsonb_agg(jsonb_build_object('sku', requested.sku, 'quantity', requested.quantity) order by requested.sku)
      into requested_lines from jsonb_to_recordset(p_lines) as requested(sku text, quantity integer);
    if not exists (
      select 1 from public.pos_holds ph where ph.number = new_hold_number
        and ph.created_by = actor_id and ph.expires_in_minutes = p_expires_in_minutes
    ) or existing_lines is distinct from requested_lines then
      raise exception 'Idempotency key sudah digunakan untuk hold berbeda';
    end if;
    return new_hold_number;
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
  new_hold_number := 'HOLD/' || lpad(nextval('public.pos_hold_number_seq')::text, 5, '0');
  insert into public.pos_holds (
    number, session_number, idempotency_key, status, expires_in_minutes, expires_at, created_by
  ) values (
    new_hold_number, session_row.number, p_idempotency_key, 'Open', p_expires_in_minutes, hold_expires_at, actor_id
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
      new_hold_number, item.sku, item.quantity, product_row.sales_price,
      item.quantity * product_row.sales_price,
      round(item.quantity * product_row.sales_price * tax_rate / 100, 0), cost
    );
    insert into public.inventory_reservations (
      sku, location_code, source_type, source_reference, quantity, status, expires_at
    ) values (
      item.sku, configuration.location_code, 'pos_hold', new_hold_number, item.quantity, 'active', hold_expires_at
    );
  end loop;
  perform public.write_business_audit('create', 'pos_hold', new_hold_number,
    jsonb_build_object('expires_at', hold_expires_at, 'lines', p_lines));
  return new_hold_number;
end;
$$;

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
  if nullif(trim(p_hold_number), '') is null or p_idempotency_key is null
     or length(trim(p_idempotency_key)) < 8 or p_tenders is null
     or jsonb_typeof(p_tenders) <> 'array' or jsonb_array_length(p_tenders) = 0 then
    raise exception 'Hold, tender, dan idempotency key wajib diisi';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_tenders) as requested_tender(payment_method text, amount numeric)
    where requested_tender.payment_method is null
      or requested_tender.payment_method not in ('CASH', 'BANK')
      or requested_tender.amount is null or requested_tender.amount <= 0
      or requested_tender.amount::text in ('NaN', 'Infinity', '-Infinity')
      or requested_tender.amount <> trunc(requested_tender.amount)
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
    if exists (
      (select requested_tender.payment_method, requested_tender.amount
       from jsonb_to_recordset(p_tenders) as requested_tender(payment_method text, amount numeric)
       except select t.payment_method, t.amount from public.pos_receipt_tenders t
       where t.receipt_number = (select pr.number from public.pos_receipts pr where pr.idempotency_key = p_idempotency_key))
      union all
      (select t.payment_method, t.amount from public.pos_receipt_tenders t
       where t.receipt_number = (select pr.number from public.pos_receipts pr where pr.idempotency_key = p_idempotency_key)
       except select requested_tender.payment_method, requested_tender.amount
       from jsonb_to_recordset(p_tenders) as requested_tender(payment_method text, amount numeric))
    ) then raise exception 'Idempotency key sudah digunakan dengan tender berbeda'; end if;
    return receipt_number;
  end if;
  perform public.expire_pos_holds();
  select * into hold_row from public.pos_holds where number = p_hold_number for update;
  if not found or hold_row.status <> 'Open' or hold_row.expires_at <= now() then
    raise exception 'Hold POS tidak aktif atau sudah kedaluwarsa';
  end if;
  if hold_row.created_by <> actor_id then raise exception 'Hold POS bukan milik sesi kasir ini'; end if;
  perform 1 from public.pos_sessions ps
    where ps.number = hold_row.session_number and ps.opened_by = actor_id
      and ps.status = 'Open' for update;
  if not found then raise exception 'Sesi POS sudah ditutup atau bukan milik kasir ini'; end if;
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
    payment_method, idempotency_key, created_by, hold_number, customer_id
  ) values (
    receipt_number, hold_row.session_number, first_sku, quantity_total,
    subtotal_total, tax_total, subtotal_total + tax_total,
    payment_method, p_idempotency_key, actor_id, p_hold_number, hold_row.customer_id
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
notify pgrst,'reload schema';



-- MIGRATION: 202611070014_quotation_rfq_workflows.sql
-- Incremental workflow completion. No seed/reset; existing posted documents are retained.

create sequence public.quotation_number_seq;
create sequence public.rfq_number_seq;
create sequence public.return_inspection_number_seq;
create table public.workflow_requests(
 idempotency_key text primary key,actor_id uuid not null references auth.users(id),
 operation text not null,payload jsonb not null,result_reference text not null,created_at timestamptz not null default now()
);
alter table public.workflow_requests enable row level security;
revoke all on public.workflow_requests from public,anon,authenticated;
create function public._workflow_replay(p_key text,p_operation text,p_payload jsonb) returns text
language plpgsql security definer set search_path='' as $$
declare old public.workflow_requests%rowtype;
begin
 if p_key is null or length(btrim(p_key))<8 then raise exception 'Idempotency key wajib diisi'; end if;
 perform public.lock_transaction_key(p_key);
 select * into old from public.workflow_requests where idempotency_key=p_key;
 if found then
  if old.actor_id is distinct from auth.uid() or old.operation<>p_operation or old.payload is distinct from p_payload then raise exception 'Idempotency key digunakan untuk tindakan berbeda'; end if;
  return old.result_reference;
 end if;
 return null;
end; $$;
create function public._workflow_record(p_key text,p_operation text,p_payload jsonb,p_result text) returns void
language sql security definer set search_path='' as $$
 insert into public.workflow_requests(idempotency_key,actor_id,operation,payload,result_reference) values(p_key,auth.uid(),p_operation,p_payload,p_result);
$$;
revoke all on function public._workflow_replay(text,text,jsonb),public._workflow_record(text,text,jsonb,text) from public,anon,authenticated;

create table public.quotations(
 number text primary key,customer_id text not null references public.customers(id),sku text not null references public.products(sku),
 quantity integer not null check(quantity>0),unit_price numeric(14,2) not null check(unit_price>0),discount_percent numeric(5,2) not null check(discount_percent between 0 and 10),
 tax_rate numeric(5,2) not null check(tax_rate>=0),subtotal numeric(14,2) not null,tax_total numeric(14,2) not null,total numeric(14,2) not null check(total=subtotal+tax_total),
 source_lead_number text references public.leads(number),status text not null check(status in ('Quotation','Sent','Pending Approval','Approved','Confirmed','Cancelled')),
 revision integer not null default 1,approved_revision integer,approved_by uuid references auth.users(id),approved_at timestamptz,approved_label text,
 sales_order_number text unique references public.sales_orders(number),created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.rfqs(
 number text primary key,vendor_id text not null references public.vendors(id),sku text not null references public.products(sku),quantity integer not null check(quantity>0),
 unit_price numeric(14,2) not null check(unit_price>0),purchase_tax text not null,total numeric(14,2) not null check(total>=0),
 status text not null check(status in ('RFQ','Sent','Confirmed','Cancelled')),revision integer not null default 1,
 purchase_order_number text unique references public.purchase_orders(number),created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.sales_orders add column quotation_number text unique references public.quotations(number);
alter table public.purchase_orders add column rfq_number text unique references public.rfqs(number);
alter table public.quotations enable row level security;
alter table public.rfqs enable row level security;
create policy "Quotations visible to Sales and Owner" on public.quotations for select to authenticated using(public.has_app_role(array['sales','owner']::public.app_role[]));
create policy "RFQs visible to Procurement and Owner" on public.rfqs for select to authenticated using(public.has_app_role(array['procurement','owner']::public.app_role[]));
grant select on public.quotations,public.rfqs to authenticated;
revoke insert,update,delete on public.quotations,public.rfqs from public,anon,authenticated;

create function public.save_quotation(p_number text,p_customer_id text,p_sku text,p_quantity integer,p_discount_percent numeric,p_source_lead_number text,p_expected_revision integer,p_idempotency_key text)
returns text language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_transaction_role(array['sales','owner']::public.app_role[]); q public.quotations%rowtype; price numeric; rate numeric; net numeric; tax numeric; ref text;
 payload jsonb:=jsonb_build_array(p_number,p_customer_id,p_sku,p_quantity,p_discount_percent,p_source_lead_number,p_expected_revision);
begin
 ref:=public._workflow_replay(p_idempotency_key,'save_quotation',payload);if ref is not null then return ref;end if;
 if p_quantity is null or p_quantity<=0 or p_discount_percent is null or p_discount_percent not between 0 and 10 then raise exception 'Quantity positif dan Discount 0–10%% wajib diisi';end if;
 if not exists(select 1 from public.customers where id=p_customer_id) then raise exception 'Customer tidak ditemukan';end if;
 if p_source_lead_number is not null and not exists(select 1 from public.leads where number=p_source_lead_number and customer_id=p_customer_id and stage in ('Qualified','Proposition','Won')) then raise exception 'Peluang sumber harus Qualified, Proposition atau Won dan milik Customer yang sama';end if;
 select sales_price into price from public.products where sku=p_sku;
 if price is null or price<=0 then raise exception 'Product atau Sales Price tidak valid';end if;
 select tr.rate into rate from public.tax_rates tr where id='PBJT10';
 net:=round(price*p_quantity*(1-p_discount_percent/100),0);tax:=round(net*rate/100,0);
 if p_number is null then
  ref:='Q'||lpad(nextval('public.quotation_number_seq')::text,5,'0');
  insert into public.quotations(number,customer_id,sku,quantity,unit_price,discount_percent,tax_rate,subtotal,tax_total,total,source_lead_number,status,created_by)
  values(ref,p_customer_id,p_sku,p_quantity,price,p_discount_percent,rate,net,tax,net+tax,p_source_lead_number,case when p_discount_percent>5 then 'Pending Approval' else 'Quotation' end,actor);
 else
  select * into q from public.quotations where number=p_number for update;
  if not found or q.status in ('Confirmed','Cancelled') then raise exception 'Quotation terkunci atau tidak ditemukan';end if;
  if p_expected_revision is null or q.revision<>p_expected_revision then raise exception 'Quotation sudah berubah; muat ulang sebelum menyimpan';end if;
  ref:=p_number;
  update public.quotations set customer_id=p_customer_id,sku=p_sku,quantity=p_quantity,unit_price=price,discount_percent=p_discount_percent,tax_rate=rate,subtotal=net,tax_total=tax,total=net+tax,source_lead_number=p_source_lead_number,status=case when p_discount_percent>5 then 'Pending Approval' else 'Quotation' end,revision=revision+1,approved_by=null,approved_at=null,approved_label=null,approved_revision=null,updated_at=now() where number=ref;
 end if;
 perform public._workflow_record(p_idempotency_key,'save_quotation',payload,ref);
 perform public.write_business_audit(case when p_number is null then 'create' else 'update' end,'quotation',ref,jsonb_build_object('total',net+tax,'discount_percent',p_discount_percent));return ref;
end; $$;

create function public.approve_quotation_discount(p_number text,p_revision integer,p_idempotency_key text) returns text
language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_transaction_role(array['owner']::public.app_role[]);q public.quotations%rowtype;ref text;payload jsonb:=jsonb_build_array(p_number,p_revision);
begin
 ref:=public._workflow_replay(p_idempotency_key,'approve_quotation',payload);if ref is not null then return ref;end if;
 select * into q from public.quotations where number=p_number for update;
 if not found or q.status in ('Confirmed','Cancelled') or q.discount_percent<=5 or q.revision<>p_revision then raise exception 'Quotation/revisi tidak memenuhi syarat persetujuan';end if;
 update public.quotations set status='Approved',approved_by=actor,approved_at=now(),approved_label=(select full_name from public.profiles where id=actor),approved_revision=revision,updated_at=now() where number=p_number;
 perform public._workflow_record(p_idempotency_key,'approve_quotation',payload,p_number);perform public.write_business_audit('approve_discount','quotation',p_number,jsonb_build_object('revision',p_revision,'discount_percent',q.discount_percent));return p_number;
end; $$;

create function public.save_rfq(p_number text,p_vendor_id text,p_sku text,p_quantity integer,p_expected_revision integer,p_idempotency_key text) returns text
language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_transaction_role(array['procurement','owner']::public.app_role[]);q public.rfqs%rowtype;price public.vendor_pricelist%rowtype;ref text;payload jsonb:=jsonb_build_array(p_number,p_vendor_id,p_sku,p_quantity,p_expected_revision);
begin
 ref:=public._workflow_replay(p_idempotency_key,'save_rfq',payload);if ref is not null then return ref;end if;
 select * into price from public.vendor_pricelist where vendor_id=p_vendor_id and sku=p_sku;
 if not found or p_quantity is null or p_quantity<price.minimum_quantity or price.purchase_price<=0 then raise exception 'Vendor/Product/Quantity minimum tidak valid';end if;
 if p_number is null then
  ref:='RFQ'||lpad(nextval('public.rfq_number_seq')::text,5,'0');
  insert into public.rfqs(number,vendor_id,sku,quantity,unit_price,purchase_tax,total,status,created_by) values(ref,p_vendor_id,p_sku,p_quantity,price.purchase_price,price.purchase_tax,p_quantity*price.purchase_price,'RFQ',actor);
 else
  select * into q from public.rfqs where number=p_number for update;
  if not found or q.status in ('Confirmed','Cancelled') then raise exception 'RFQ terkunci atau tidak ditemukan';end if;
  if p_expected_revision is null or q.revision<>p_expected_revision then raise exception 'RFQ sudah berubah; muat ulang';end if;
  ref:=p_number;update public.rfqs set vendor_id=p_vendor_id,sku=p_sku,quantity=p_quantity,unit_price=price.purchase_price,purchase_tax=price.purchase_tax,total=p_quantity*price.purchase_price,status='RFQ',revision=revision+1,updated_at=now() where number=ref;
 end if;
 perform public._workflow_record(p_idempotency_key,'save_rfq',payload,ref);perform public.write_business_audit(case when p_number is null then 'create' else 'update' end,'rfq',ref,jsonb_build_object('total',p_quantity*price.purchase_price));return ref;
end; $$;

create function public.confirm_quotation(p_number text,p_idempotency_key text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.quotations%rowtype; p_customer_id text; p_sku text; p_quantity integer; p_discount_percent numeric; p_source_lead_number text;
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

  select * into q from public.quotations where number=p_number for update;
  if not found or q.status='Cancelled' then raise exception 'Quotation tidak aktif';end if;
  if q.status='Confirmed' then return q.sales_order_number;end if;
  if q.discount_percent>5 and (q.approved_by is null or q.approved_revision is distinct from q.revision) then raise exception 'Persetujuan Owner wajib untuk diskon di atas 5%%';end if;
  p_customer_id:=q.customer_id;p_sku:=q.sku;p_quantity:=q.quantity;p_discount_percent:=q.discount_percent;p_source_lead_number:=q.source_lead_number;
  if p_source_lead_number is not null then
   if not exists(select 1 from public.leads where number=p_source_lead_number and customer_id=p_customer_id and stage in ('Qualified','Proposition','Won')) then raise exception 'Peluang sumber tidak memenuhi syarat';end if;
   update public.leads set stage='Won' where number=p_source_lead_number and stage<>'Won';
   perform public.write_business_audit('convert','lead',p_source_lead_number,jsonb_build_object('quotation',p_number));
  end if;
  perform public._expire_pos_holds_system(actor_id,'create_sales_order');
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'Idempotency key wajib diisi';
  end if;
  perform public.lock_transaction_key(p_idempotency_key);
  if p_quantity is null or p_quantity <= 0 then raise exception 'Kuantitas harus lebih dari nol'; end if;
  if p_discount_percent is null or p_discount_percent < 0 or p_discount_percent > 10 then
    raise exception 'Diskon harus 0–10%%';
  end if;

  select so.number into existing_number from public.sales_orders so
  where so.idempotency_key = p_idempotency_key;
  if existing_number is not null then raise exception 'Idempotency key sudah dipakai Sales Order lain';end if;

  select * into customer_row from public.customers where id = p_customer_id for update;
  if not found then raise exception 'Pelanggan tidak ditemukan'; end if;
  select * into product_row from public.products where sku = p_sku;
  if not found then raise exception 'SKU tidak ditemukan'; end if;
  product_row.sales_price:=q.unit_price;
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
  update public.sales_orders set quotation_number=p_number where number=order_number;
  update public.quotations set status='Confirmed',sales_order_number=order_number,updated_at=now() where number=p_number;
  perform public.write_business_audit('confirm','quotation',p_number,jsonb_build_object('sales_order',order_number,'revision',q.revision));
  return order_number;
end;
$$;

create function public.confirm_rfq(p_number text,p_idempotency_key text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.rfqs%rowtype;p_vendor_id text;p_sku text;p_quantity integer;
  actor_id uuid := public.require_transaction_role(array['procurement', 'owner']::public.app_role[]);
  price_row public.vendor_pricelist%rowtype;
  po_number text;
  total_amount numeric(14, 2);
begin
  select * into q from public.rfqs where number=p_number for update;
  if not found or q.status='Cancelled' then raise exception 'RFQ tidak aktif';end if;
  if q.status='Confirmed' then return q.purchase_order_number;end if;
  p_vendor_id:=q.vendor_id;p_sku:=q.sku;p_quantity:=q.quantity;
  if p_quantity is null or p_quantity <= 0 or p_idempotency_key is null then raise exception 'Kuantitas dan idempotency key wajib'; end if;
  perform public.lock_transaction_key(p_idempotency_key);
  select po.number into po_number from public.purchase_orders po where po.idempotency_key = p_idempotency_key;
  if po_number is not null then raise exception 'Idempotency key sudah dipakai PO lain';end if;

  select * into price_row from public.vendor_pricelist where vendor_id = p_vendor_id and sku = p_sku for update;
  if not found then raise exception 'SKU tidak tersedia pada daftar harga pemasok'; end if;
  if p_quantity < price_row.minimum_quantity then raise exception 'Kuantitas di bawah minimum pembelian'; end if;
  if price_row.purchase_price <= 0 then raise exception 'Harga beli harus lebih besar dari nol'; end if;
  price_row.purchase_price:=q.unit_price;price_row.purchase_tax:=q.purchase_tax;
  total_amount := p_quantity * price_row.purchase_price;
  po_number := 'PO' || lpad(nextval('public.purchase_order_number_seq')::text, 5, '0');
  insert into public.purchase_orders (number, vendor_id, status, order_date, destination_code, total, locked_at, idempotency_key, request_hash)
  values (po_number, p_vendor_id, 'Purchase Order', (now() at time zone 'Asia/Jakarta')::date, 'WH-TBT', total_amount, now(),
    p_idempotency_key, md5(p_vendor_id || '|' || p_sku || '|' || p_quantity::text));
  insert into public.purchase_order_lines (purchase_order_number, sku, quantity, unit_price, purchase_tax)
  values (po_number, p_sku, p_quantity, price_row.purchase_price, price_row.purchase_tax);
  perform public.write_business_audit('create', 'purchase_order', po_number,
    jsonb_build_object('vendor_id', p_vendor_id, 'sku', p_sku, 'quantity', p_quantity, 'total', total_amount));
  update public.purchase_orders set rfq_number=p_number where number=po_number;
  update public.rfqs set status='Confirmed',purchase_order_number=po_number,updated_at=now() where number=p_number;
  perform public.write_business_audit('confirm','rfq',p_number,jsonb_build_object('purchase_order',po_number));
  return po_number;
end;
$$;

create function public.change_draft_status(p_kind text,p_number text,p_status text,p_idempotency_key text) returns text
language plpgsql security definer set search_path='' as $$
declare actor uuid;old_status text;ref text;payload jsonb:=jsonb_build_array(p_kind,p_number,p_status);
begin
 if p_kind='quotation' then actor:=public.require_transaction_role(array['sales','owner']::public.app_role[]);
 elsif p_kind='rfq' then actor:=public.require_transaction_role(array['procurement','owner']::public.app_role[]);
 else raise exception 'Jenis draft tidak valid';end if;
 ref:=public._workflow_replay(p_idempotency_key,'change_draft_status',payload);if ref is not null then return ref;end if;
 if p_status not in ('Sent','Cancelled') or p_status is null then raise exception 'Status draft tidak valid';end if;
 if p_kind='quotation' then
  select status into old_status from public.quotations where number=p_number for update;
  if not found or old_status in ('Confirmed','Cancelled') then raise exception 'Quotation terkunci';end if;
  if p_status='Sent' and old_status='Pending Approval' then raise exception 'Persetujuan Owner belum tersedia';end if;
  update public.quotations set status=p_status,updated_at=now() where number=p_number;
 else
  select status into old_status from public.rfqs where number=p_number for update;
  if not found or old_status in ('Confirmed','Cancelled') then raise exception 'RFQ terkunci';end if;
  update public.rfqs set status=p_status,updated_at=now() where number=p_number;
 end if;
 perform public._workflow_record(p_idempotency_key,'change_draft_status',payload,p_number);perform public.write_business_audit(lower(p_status),p_kind,p_number,'{}');return p_number;
end; $$;

revoke all on function public.save_quotation(text,text,text,integer,numeric,text,integer,text) from public,anon;
grant execute on function public.save_quotation(text,text,text,integer,numeric,text,integer,text) to authenticated;

revoke all on function public.approve_quotation_discount(text,integer,text) from public,anon;
grant execute on function public.approve_quotation_discount(text,integer,text) to authenticated;

revoke all on function public.save_rfq(text,text,text,integer,integer,text) from public,anon;
grant execute on function public.save_rfq(text,text,text,integer,integer,text) to authenticated;

revoke all on function public.confirm_quotation(text,text) from public,anon;
grant execute on function public.confirm_quotation(text,text) to authenticated;

revoke all on function public.confirm_rfq(text,text) from public,anon;
grant execute on function public.confirm_rfq(text,text) to authenticated;

revoke all on function public.change_draft_status(text,text,text,text) from public,anon;
grant execute on function public.change_draft_status(text,text,text,text) to authenticated;

notify pgrst,'reload schema';



-- MIGRATION: 202611070015_master_crud_log_notes.sql
-- Role-scoped master CRUD and immutable, persistent document Log Notes.

create function public.manage_master(p_kind text,p_operation text,p_id text,p_data jsonb,p_idempotency_key text) returns text
language plpgsql security definer set search_path='' as $$
declare actor uuid;ref text;role_name public.app_role;old_customer public.customers%rowtype;old_cost numeric;credit numeric;price numeric;cost numeric;payload jsonb:=jsonb_build_array(p_kind,p_operation,p_id,p_data);
begin
 if p_kind='customer' then actor:=public.require_transaction_role(array['sales','finance','owner']::public.app_role[]);
 elsif p_kind='vendor' then actor:=public.require_transaction_role(array['procurement','owner']::public.app_role[]);
 elsif p_kind='product' then actor:=public.require_transaction_role(array['owner']::public.app_role[]);
 else raise exception 'Jenis master tidak valid';end if;
 select role into role_name from public.profiles where id=actor;
 if p_operation is null or p_operation not in ('create','update','delete') or p_id is null or p_id !~ '^[A-Z0-9]+(-[A-Z0-9]+)*$' then raise exception 'Operation dan Reference master tidak valid';end if;
 ref:=public._workflow_replay(p_idempotency_key,'master',payload);if ref is not null then return ref;end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('master:'||p_kind||':'||p_id));
 if p_operation='delete' then
  if exists(select 1 from public.document_notes where document_kind=p_kind and document_reference=p_id)then raise exception 'Master memiliki Log Notes; riwayat harus dipertahankan';end if;
  if role_name<>'owner' then raise exception using errcode='42501',message='Hanya Owner dapat menghapus master yang belum dipakai';end if;
  if p_kind='customer' then delete from public.customers where id=p_id;
  elsif p_kind='vendor' then delete from public.vendors where id=p_id;
  else
   if exists(select 1 from public.stock_balances where sku=p_id and on_hand<>0) or exists(select 1 from public.inventory_reservations where sku=p_id) then raise exception 'Product memiliki stok/riwayat reservasi; tidak dapat dihapus';end if;
   delete from public.vendor_pricelist where sku=p_id;delete from public.stock_balances where sku=p_id;delete from public.product_costs where sku=p_id;delete from public.products where sku=p_id;
  end if;
  if not found then raise exception 'Master tidak ditemukan';end if;
 else
  if p_data is null or nullif(btrim(p_data->>'name'),'') is null then raise exception 'Name wajib diisi';end if;
  if p_kind='customer' then
   credit:=(p_data->>'credit_limit')::numeric;
   if credit is null or credit<0 or credit::text in ('NaN','Infinity','-Infinity') or p_data->>'type' not in ('Perusahaan','Perorangan') or nullif(btrim(p_data->>'city'),'') is null or not exists(select 1 from public.payment_terms where code=p_data->>'payment_terms_code') then raise exception 'Customer Type, City, Credit Limit dan Payment Terms tidak valid';end if;
   if p_id='C06' and (credit<>0 or p_data->>'payment_terms_code'<>'COD') then raise exception 'C06 wajib COD dengan Credit Limit 0';end if;
   select * into old_customer from public.customers where id=p_id for update;
   if role_name='sales' and ((p_operation='create' and (credit<>0 or p_data->>'payment_terms_code'<>'COD')) or (p_operation='update' and (old_customer.credit_limit is distinct from credit or old_customer.payment_terms_code is distinct from p_data->>'payment_terms_code'))) then raise exception using errcode='42501',message='Perubahan Credit Limit/Payment Terms membutuhkan Finance atau Owner';end if;
   if p_operation='create' then insert into public.customers(id,name,type,city,credit_limit,payment_terms_code) values(p_id,btrim(p_data->>'name'),p_data->>'type',btrim(p_data->>'city'),credit,p_data->>'payment_terms_code');
   else update public.customers set name=btrim(p_data->>'name'),type=p_data->>'type',city=btrim(p_data->>'city'),credit_limit=credit,payment_terms_code=p_data->>'payment_terms_code' where id=p_id;if not found then raise exception 'Customer tidak ditemukan';end if;end if;
  elsif p_kind='vendor' then
   if nullif(btrim(p_data->>'city'),'') is null or nullif(btrim(p_data->>'tax_profile'),'') is null or not exists(select 1 from public.payment_terms where code=p_data->>'payment_terms_code') then raise exception 'City, Tax Profile dan Payment Terms wajib valid';end if;
   if p_operation='create' then insert into public.vendors(id,name,city,payment_terms_code,tax_profile) values(p_id,btrim(p_data->>'name'),btrim(p_data->>'city'),p_data->>'payment_terms_code',btrim(p_data->>'tax_profile'));
   else update public.vendors set name=btrim(p_data->>'name'),city=btrim(p_data->>'city'),payment_terms_code=p_data->>'payment_terms_code',tax_profile=btrim(p_data->>'tax_profile') where id=p_id;if not found then raise exception 'Vendor tidak ditemukan';end if;end if;
  else
   price:=(p_data->>'sales_price')::numeric;cost:=(p_data->>'standard_cost')::numeric;
   if price is null or cost is null or price<0 or cost<0 or price::text in ('NaN','Infinity','-Infinity') or cost::text in ('NaN','Infinity','-Infinity') or nullif(btrim(p_data->>'size'),'') is null or nullif(btrim(p_data->>'color'),'') is null or not exists(select 1 from public.vendors where id=p_data->>'default_vendor_id') then raise exception 'Size, Variant, Sales Price, Standard Cost dan Vendor tidak valid';end if;
   if p_operation='create' then
    insert into public.products(sku,name,size,color,unit,sales_price,default_vendor_id) values(p_id,btrim(p_data->>'name'),btrim(p_data->>'size'),btrim(p_data->>'color'),'unit',price,p_data->>'default_vendor_id');
    insert into public.product_costs(sku,standard_cost)values(p_id,cost);insert into public.stock_balances(sku,location_code,on_hand)select p_id,code,0 from public.locations;
   else
    perform 1 from public.products where sku=p_id for update;if not found then raise exception 'Product tidak ditemukan';end if;
    select standard_cost into old_cost from public.product_costs where sku=p_id for update;
    if cost is distinct from old_cost and (exists(select 1 from public.stock_balances where sku=p_id and on_hand<>0) or exists(select 1 from public.sales_order_lines where sku=p_id) or exists(select 1 from public.purchase_order_lines where sku=p_id) or exists(select 1 from public.pos_receipt_lines where sku=p_id)) then raise exception 'Standard Cost terkunci untuk Product yang memiliki stok/riwayat; Sales Price boleh diubah';end if;
    update public.products set name=btrim(p_data->>'name'),size=btrim(p_data->>'size'),color=btrim(p_data->>'color'),sales_price=price,default_vendor_id=p_data->>'default_vendor_id' where sku=p_id;
    update public.product_costs set standard_cost=cost where sku=p_id;
   end if;
  end if;
 end if;
 perform public._workflow_record(p_idempotency_key,'master',payload,p_id);perform public.write_business_audit(p_operation,p_kind,p_id,jsonb_build_object('fields',case when p_operation='delete' then '{}'::jsonb else p_data end));return p_id;
exception when foreign_key_violation then raise exception 'Master masih dipakai dokumen atau master lain; tidak dapat dihapus/diubah';
 when unique_violation then raise exception 'Reference/SKU atau kombinasi Product/Size sudah ada; duplikasi ditolak';
end; $$;
revoke all on function public.manage_master(text,text,text,jsonb,text) from public,anon;
grant execute on function public.manage_master(text,text,text,jsonb,text) to authenticated;

create function public._document_visible(p_kind text,p_reference text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare user_role public.app_role;table_name text;key_name text:='number';allowed public.app_role[];found_record boolean;
begin
 select role into user_role from public.profiles where id=auth.uid();if not found then return false;end if;
 case p_kind
 when 'return-move' then table_name:='return_stock_moves';allowed:=array['warehouse','finance','owner']::public.app_role[];
 when 'return-inspection' then table_name:='return_inspections';allowed:=array['warehouse','finance','owner']::public.app_role[];
 when 'quotation' then table_name:='quotations';allowed:=array['sales','owner']::public.app_role[];
 when 'rfq' then table_name:='rfqs';allowed:=array['procurement','owner']::public.app_role[];
 when 'sales' then table_name:='sales_orders';allowed:=array['sales','warehouse','owner']::public.app_role[];
 when 'delivery' then table_name:='delivery_notes';allowed:=array['sales','warehouse','owner']::public.app_role[];
 when 'purchase' then table_name:='purchase_orders';allowed:=array['procurement','warehouse','owner']::public.app_role[];
 when 'receipt' then table_name:='goods_receipts';allowed:=array['procurement','warehouse','owner']::public.app_role[];
 when 'lead' then table_name:='leads';allowed:=array['sales','owner']::public.app_role[];
 when 'invoice' then table_name:='customer_invoices';allowed:=array['finance','owner']::public.app_role[];
 when 'bill' then table_name:='vendor_bills';allowed:=array['finance','owner']::public.app_role[];
 when 'payment' then table_name:='customer_payments';allowed:=array['finance','owner']::public.app_role[];
 when 'vendor-payment' then table_name:='vendor_payments';allowed:=array['finance','owner']::public.app_role[];
 when 'credit-note' then table_name:='credit_notes';allowed:=array['finance','owner']::public.app_role[];
 when 'journal' then table_name:='journal_entries';allowed:=array['finance','owner']::public.app_role[];
 when 'transfer' then table_name:='inventory_transfers';allowed:=array['warehouse','procurement','owner']::public.app_role[];
 when 'product' then table_name:='products';key_name:='sku';allowed:=enum_range(null::public.app_role);
 when 'customer' then table_name:='customers';key_name:='id';allowed:=enum_range(null::public.app_role);
 when 'vendor' then table_name:='vendors';key_name:='id';allowed:=enum_range(null::public.app_role);
 when 'session' then
  return user_role in ('cashier','owner') and exists(select 1 from public.pos_sessions where number=p_reference and (user_role='owner' or opened_by=auth.uid()));
 when 'hold' then
  return user_role in ('cashier','owner') and exists(select 1 from public.pos_holds where number=p_reference and (user_role='owner' or created_by=auth.uid()));
 when 'pos-receipt' then
  return user_role in ('cashier','owner') and exists(select 1 from public.pos_receipts where number=p_reference and (user_role='owner' or created_by=auth.uid()));
 else return false;
 end case;
 if not(user_role=any(allowed)) then return false;end if;
 execute format('select exists(select 1 from public.%I where %I=$1)',table_name,key_name) into found_record using p_reference;
 return found_record;
end; $$;
revoke all on function public._document_visible(text,text) from public,anon;
grant execute on function public._document_visible(text,text) to authenticated;
create table public.document_notes(
 id uuid primary key default gen_random_uuid(),document_kind text not null,document_reference text not null,
 body text not null check(length(btrim(body)) between 1 and 2000),actor_id uuid not null references auth.users(id),actor_label text not null,
 created_at timestamptz not null default now(),idempotency_key text not null unique
);
create index document_notes_reference_idx on public.document_notes(document_kind,document_reference,created_at);
alter table public.document_notes enable row level security;
create policy "Notes visible with their document" on public.document_notes for select to authenticated using(public._document_visible(document_kind,document_reference));
grant select on public.document_notes to authenticated;
revoke insert,update,delete on public.document_notes from public,anon,authenticated;
create function public.add_document_note(p_kind text,p_reference text,p_body text,p_idempotency_key text) returns text
language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_transaction_role(enum_range(null::public.app_role));label text;ref text;payload jsonb:=jsonb_build_array(p_kind,p_reference,btrim(p_body));
begin
 if not public._document_visible(p_kind,p_reference) then raise exception using errcode='42501',message='Dokumen tidak tersedia untuk role ini';end if;
 if p_body is null or length(btrim(p_body)) not between 1 and 2000 then raise exception 'Log Note wajib 1–2000 karakter';end if;
 ref:=public._workflow_replay(p_idempotency_key,'log_note',payload);if ref is not null then return ref;end if;
 select full_name into label from public.profiles where id=actor;
 insert into public.document_notes(document_kind,document_reference,body,actor_id,actor_label,idempotency_key) values(p_kind,p_reference,btrim(p_body),actor,label,p_idempotency_key) returning id::text into ref;
 perform public._workflow_record(p_idempotency_key,'log_note',payload,ref);perform public.write_business_audit('log_note',p_kind,p_reference,jsonb_build_object('note_id',ref));return ref;
end; $$;
revoke all on function public.add_document_note(text,text,text,text) from public,anon;
grant execute on function public.add_document_note(text,text,text,text) to authenticated;
notify pgrst,'reload schema';



-- MIGRATION: 202611070016_return_inspection_workflow.sql
-- Warehouse inspection/return movement followed by Finance Credit Note.

create table public.return_inspections(
 number text primary key,invoice_number text not null references public.customer_invoices(number),invoice_line_id uuid not null references public.customer_invoice_lines(id),
 sku text not null references public.products(sku),quantity integer not null check(quantity>0),item_condition text not null check(item_condition in ('sealed','damaged')),
 subtotal numeric(14,2) not null,tax_amount numeric(14,2) not null,total numeric(14,2) not null check(total=subtotal+tax_amount),
 status text not null check(status in ('Approved','Posted')),inspected_by uuid not null references auth.users(id),inspector_label text not null,inspected_at timestamptz not null default now(),
 credit_note_number text unique references public.credit_notes(number),idempotency_key text not null unique
);
create table public.return_stock_moves(
 number text primary key,inspection_number text not null unique references public.return_inspections(number),sku text not null references public.products(sku),
 location_code text not null references public.locations(code),restock_quantity integer not null check(restock_quantity>=0),rejected_quantity integer not null check(rejected_quantity>=0),
 stock_value numeric(14,2) not null check(stock_value>=0),moved_at timestamptz not null default now(),created_by uuid not null references auth.users(id)
);
alter table public.return_inspections enable row level security;alter table public.return_stock_moves enable row level security;
create policy "Inspections visible to Warehouse Finance Owner" on public.return_inspections for select to authenticated using(public.has_app_role(array['warehouse','finance','owner']::public.app_role[]));
create policy "Return movements visible to Warehouse Finance Owner" on public.return_stock_moves for select to authenticated using(public.has_app_role(array['warehouse','finance','owner']::public.app_role[]));
grant select on public.return_inspections,public.return_stock_moves to authenticated;
revoke insert,update,delete on public.return_inspections,public.return_stock_moves from public,anon,authenticated;

create function public.inspect_customer_return(p_invoice_number text,p_sku text,p_quantity integer,p_item_condition text,p_idempotency_key text) returns text
language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_transaction_role(array['warehouse','owner']::public.app_role[]);inv public.customer_invoices%rowtype;line public.customer_invoice_lines%rowtype;
 returned integer;pending integer;pending_value numeric;net numeric;tax numeric;cost numeric;ref text;label text;
 payload jsonb:=jsonb_build_array(p_invoice_number,p_sku,p_quantity,p_item_condition);
begin
 ref:=public._workflow_replay(p_idempotency_key,'inspect_return',payload);if ref is not null then return ref;end if;
 if p_quantity is null or p_quantity<=0 or p_item_condition is null or p_item_condition not in ('sealed','damaged') then raise exception 'Quantity positif dan Condition sealed/damaged wajib';end if;
 select * into inv from public.customer_invoices where number=p_invoice_number for update;
 if not found or inv.status<>'Posted' then raise exception 'Original Invoice tidak tersedia';end if;
 select * into line from public.customer_invoice_lines where invoice_number=p_invoice_number and sku=p_sku for update;
 if not found then raise exception 'Product tidak terdapat pada invoice terkirim';end if;
 select coalesce(sum(quantity),0) into returned from public.credit_note_lines where invoice_line_id=line.id;
 select coalesce(sum(quantity),0) into pending from public.return_inspections where invoice_line_id=line.id and status='Approved';
 if returned+pending+p_quantity>line.quantity then raise exception 'Return Quantity melebihi jumlah terkirim dikurangi retur/inspeksi terdahulu';end if;
 net:=round(line.subtotal*p_quantity/line.quantity,0);tax:=round(line.tax_amount*p_quantity/line.quantity,0);
 select coalesce(sum(total),0) into pending_value from public.return_inspections where invoice_number=p_invoice_number and status='Approved';
 if net+tax+pending_value>inv.total-inv.amount_paid-inv.amount_credited then raise exception 'Nilai retur melebihi piutang tersisa; refund tunai tidak diaktifkan';end if;
 select full_name into label from public.profiles where id=actor;
 ref:='RI'||lpad(nextval('public.return_inspection_number_seq')::text,5,'0');
 insert into public.return_inspections(number,invoice_number,invoice_line_id,sku,quantity,item_condition,subtotal,tax_amount,total,status,inspected_by,inspector_label,idempotency_key)
 values(ref,p_invoice_number,line.id,p_sku,p_quantity,p_item_condition,net,tax,net+tax,'Approved',actor,label,p_idempotency_key);
 if p_item_condition='sealed' then
  perform 1 from public.stock_balances where sku=p_sku and location_code='WH-TBT' for update;
  if not found then raise exception 'Return Location tidak tersedia';end if;
  update public.stock_balances set on_hand=on_hand+p_quantity where sku=p_sku and location_code='WH-TBT';
  select standard_cost*p_quantity into cost from public.product_costs where sku=p_sku;
  perform public.post_business_journal('return_receipt',ref,'return-stock:'||p_idempotency_key,'Penerimaan retur '||ref,jsonb_build_array(jsonb_build_object('account_code','1301','debit',cost,'credit',0),jsonb_build_object('account_code','5101','debit',0,'credit',cost)));
 else cost:=0;end if;
 insert into public.return_stock_moves(number,inspection_number,sku,location_code,restock_quantity,rejected_quantity,stock_value,created_by)
 values('RM-'||ref,ref,p_sku,'WH-TBT',case when p_item_condition='sealed' then p_quantity else 0 end,case when p_item_condition='damaged' then p_quantity else 0 end,cost,actor);
 perform public._workflow_record(p_idempotency_key,'inspect_return',payload,ref);perform public.write_business_audit('inspect_return','return-inspection',ref,jsonb_build_object('invoice',p_invoice_number,'quantity',p_quantity,'condition',p_item_condition,'return_move','RM-'||ref));return ref;
end; $$;

create function public._post_inspected_credit(
  p_invoice_number text,
  p_sku text,
  p_quantity integer,
  p_item_condition text,
  p_idempotency_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['finance', 'owner']::public.app_role[]);
  invoice_row public.customer_invoices%rowtype;
  invoice_line public.customer_invoice_lines%rowtype;
  product_cost numeric(14, 2);
  credit_number text;
  returned_quantity integer;
  credit_subtotal numeric(14, 2);
  credit_tax numeric(14, 2);
  credit_total numeric(14, 2);
  credit_cogs numeric(14, 2);
begin
  if p_quantity is null or p_quantity <= 0 or p_idempotency_key is null then raise exception 'Kuantitas dan idempotency key wajib'; end if;
  if p_item_condition not in ('sealed', 'damaged') then raise exception 'Kondisi barang harus sealed atau damaged'; end if;
  perform public.lock_transaction_key(p_idempotency_key);
  select cn.number into credit_number from public.credit_notes cn where cn.idempotency_key = p_idempotency_key;
  if credit_number is not null then
    if not exists (
      select 1 from public.credit_notes cn
      join public.credit_note_lines cnl on cnl.credit_note_number = cn.number
      where cn.number = credit_number and cn.invoice_number = p_invoice_number
        and cnl.sku = p_sku and cnl.quantity = p_quantity
        and cnl.item_condition = p_item_condition
    ) then raise exception 'Idempotency key sudah digunakan untuk Credit Note berbeda'; end if;
    return credit_number;
  end if;
  select * into invoice_row from public.customer_invoices where number = p_invoice_number for update;
  if not found or invoice_row.status <> 'Posted' then raise exception 'Invoice tidak dapat diretur'; end if;
  select * into invoice_line from public.customer_invoice_lines
    where invoice_number = p_invoice_number and sku = p_sku for update;
  if not found then raise exception 'SKU tidak terdapat pada invoice'; end if;
  select coalesce(sum(cnl.quantity), 0)::integer into returned_quantity
    from public.credit_note_lines cnl where cnl.invoice_line_id = invoice_line.id;
  if returned_quantity + p_quantity > invoice_line.quantity then raise exception 'Retur melebihi kuantitas yang ditagih'; end if;
  credit_subtotal := round(invoice_line.subtotal * p_quantity / invoice_line.quantity, 0);
  credit_tax := round(invoice_line.tax_amount * p_quantity / invoice_line.quantity, 0);
  credit_total := credit_subtotal + credit_tax;
  if credit_total > invoice_row.total - invoice_row.amount_paid - invoice_row.amount_credited then
    raise exception 'Credit Note melebihi piutang tersisa; refund tunai tidak diaktifkan';
  end if;
  credit_number := 'CN' || lpad(nextval('public.credit_note_number_seq')::text, 5, '0');
  insert into public.credit_notes (number, invoice_number, idempotency_key, subtotal, tax_amount, total, created_by)
  values (credit_number, p_invoice_number, p_idempotency_key, credit_subtotal, credit_tax, credit_total, actor_id);
  insert into public.credit_note_lines (
    credit_note_number, invoice_line_id, sku, quantity, item_condition, subtotal, tax_amount
  ) values (
    credit_number, invoice_line.id, p_sku, p_quantity, p_item_condition, credit_subtotal, credit_tax
  );
  update public.customer_invoices set amount_credited = amount_credited + credit_total where number = p_invoice_number;
  -- Warehouse inspection already posted stock/COGS exactly once.
  product_cost := 0;
  perform public.post_business_journal(
    'credit_note', credit_number, 'credit-note:' || p_idempotency_key,
    'Retur pelanggan ' || p_invoice_number,
    jsonb_build_array(
      jsonb_build_object('account_code', '4101', 'debit', credit_subtotal, 'credit', 0),
      jsonb_build_object('account_code', '2102', 'debit', credit_tax, 'credit', 0),
      jsonb_build_object('account_code', '1201', 'debit', 0, 'credit', credit_total),
      jsonb_build_object('account_code', '1301', 'debit', product_cost, 'credit', 0),
      jsonb_build_object('account_code', '5101', 'debit', 0, 'credit', product_cost)
    )
  );
  perform public.write_business_audit('credit_note', 'credit_note', credit_number,
    jsonb_build_object('invoice', p_invoice_number, 'sku', p_sku, 'quantity', p_quantity, 'condition', p_item_condition, 'total', credit_total));
  return credit_number;
end;
$$;
revoke all on function public._post_inspected_credit(text,text,integer,text,text) from public,anon,authenticated;

create function public.post_return_inspection(p_number text,p_idempotency_key text) returns text
language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_transaction_role(array['finance','owner']::public.app_role[]);inspection public.return_inspections%rowtype;ref text;payload jsonb:=jsonb_build_array(p_number);
begin
 ref:=public._workflow_replay(p_idempotency_key,'post_inspection',payload);if ref is not null then return ref;end if;
 select * into inspection from public.return_inspections where number=p_number for update;
 if not found then raise exception 'Warehouse Inspection tidak ditemukan';end if;
 if inspection.status='Posted' then return inspection.credit_note_number;end if;
 ref:=public._post_inspected_credit(inspection.invoice_number,inspection.sku,inspection.quantity,inspection.item_condition,p_idempotency_key);
 update public.return_inspections set status='Posted',credit_note_number=ref where number=p_number;
 perform public._workflow_record(p_idempotency_key,'post_inspection',payload,ref);perform public.write_business_audit('post_credit','return-inspection',p_number,jsonb_build_object('credit_note',ref));return ref;
end; $$;
create or replace function public.create_customer_credit_note(p_invoice_number text,p_sku text,p_quantity integer,p_item_condition text,p_idempotency_key text) returns text
language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_transaction_role(array['finance','owner']::public.app_role[]);ref text;inspection_ref text;
begin
 perform public.lock_transaction_key(p_idempotency_key);
 select number into ref from public.credit_notes where idempotency_key=p_idempotency_key;
 if ref is not null then
  if not exists(select 1 from public.credit_notes n join public.credit_note_lines l on l.credit_note_number=n.number where n.number=ref and n.invoice_number=p_invoice_number and l.sku=p_sku and l.quantity=p_quantity and l.item_condition=p_item_condition)then raise exception 'Idempotency key dipakai Credit Note berbeda';end if;
  return ref;
 end if;
 select number into inspection_ref from public.return_inspections where invoice_number=p_invoice_number and sku=p_sku and quantity=p_quantity and item_condition=p_item_condition and status='Approved' order by inspected_at,number limit 1;
 if inspection_ref is null then raise exception 'Warehouse harus menyetujui Inspection yang cocok sebelum posting Credit Note';end if;
 return public.post_return_inspection(inspection_ref,p_idempotency_key);
end; $$;
revoke all on function public.inspect_customer_return(text,text,integer,text,text),public.post_return_inspection(text,text),public.create_customer_credit_note(text,text,integer,text,text) from public,anon;
grant execute on function public.inspect_customer_return(text,text,integer,text,text),public.post_return_inspection(text,text),public.create_customer_credit_note(text,text,integer,text,text) to authenticated;

-- Note visibility for inspection documents matches their Warehouse/Finance/Owner policy.
create function public.inspection_document_visible(p_reference text) returns boolean language sql stable security definer set search_path='' as $$
 select public.has_app_role(array['warehouse','finance','owner']::public.app_role[]) and exists(select 1 from public.return_inspections where number=p_reference);
$$;
revoke all on function public.inspection_document_visible(text) from public,anon;grant execute on function public.inspection_document_visible(text) to authenticated;

create function public.list_returnable_invoice_lines() returns table(invoice_number text,sku text,product_name text,delivered_quantity integer,remaining_quantity integer)
language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=public.require_transaction_role(array['warehouse','finance','owner']::public.app_role[]);
begin
 return query select l.invoice_number,l.sku,p.name,l.quantity,
 (l.quantity-coalesce((select sum(c.quantity) from public.credit_note_lines c where c.invoice_line_id=l.id),0)-coalesce((select sum(i.quantity) from public.return_inspections i where i.invoice_line_id=l.id and i.status='Approved'),0))::integer
 from public.customer_invoice_lines l join public.customer_invoices inv on inv.number=l.invoice_number join public.products p on p.sku=l.sku
 where inv.status='Posted' and inv.total-inv.amount_paid-inv.amount_credited>0;
end; $$;
revoke all on function public.list_returnable_invoice_lines() from public,anon;grant execute on function public.list_returnable_invoice_lines() to authenticated;
notify pgrst,'reload schema';



-- MIGRATION: 202611070017_workflow_integrity_controls.sql

create or replace function public.open_pos_session(
  p_opening_cash numeric,
  p_idempotency_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['cashier', 'owner']::public.app_role[]);
  profile_name text;
  session_number text;
  configuration public.pos_configuration%rowtype;
begin
  if p_opening_cash is null or p_opening_cash < 0 or p_idempotency_key is null then raise exception 'Kas awal dan idempotency key tidak valid'; end if;
  perform public.lock_transaction_key(p_idempotency_key);
  select ps.number into session_number from public.pos_sessions ps where ps.idempotency_key = p_idempotency_key;
  if session_number is not null then
    if not exists (
      select 1 from public.pos_sessions ps where ps.number = session_number
        and ps.opened_by = actor_id and ps.opening_cash = p_opening_cash
    ) then raise exception 'Idempotency key sudah digunakan untuk sesi POS berbeda'; end if;
    return session_number;
  end if;
  if exists (select 1 from public.pos_sessions ps where ps.opened_by = actor_id and ps.status in ('Open', 'Pending Approval')) then
    raise exception 'Kasir sudah memiliki sesi POS yang belum ditutup';
  end if;
  select * into configuration from public.pos_configuration where id = 'POS-TBT';
  if not found then raise exception 'Konfigurasi POS tidak ditemukan'; end if;
  if p_opening_cash <> configuration.opening_cash then raise exception 'Kas awal POS harus sesuai konfigurasi'; end if;
  select full_name into profile_name from public.profiles where id = actor_id;
  if public.has_app_role(array['cashier']::public.app_role[]) then
    select ps.number into session_number from public.pos_sessions ps where ps.status='Opening Control' and ps.opened_by is null order by ps.number for update skip locked limit 1;
    if session_number is not null then
      update public.pos_sessions set cashier_label=profile_name,status='Open',opening_cash=p_opening_cash,expected_cash=p_opening_cash,opened_at=now(),opened_by=actor_id,idempotency_key=p_idempotency_key where number=session_number;
      perform public.write_business_audit('open','pos_session',session_number,jsonb_build_object('opening_cash',p_opening_cash));return session_number;
    end if;
  end if;
  session_number := 'POS/' || lpad(nextval('public.pos_session_number_seq')::text, 5, '0');
  insert into public.pos_sessions (number, cashier_label, status, opening_cash, opened_at, opened_by, idempotency_key)
  values (session_number, profile_name, 'Open', p_opening_cash, now(), actor_id, p_idempotency_key);
  perform public.write_business_audit('open', 'pos_session', session_number, jsonb_build_object('opening_cash', p_opening_cash));
  return session_number;
end;
$$;
create or replace function public.close_pos_session(
  p_session_number text,
  p_counted_cash numeric,
  p_variance_reason text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['cashier', 'owner']::public.app_role[]);
  session_row public.pos_sessions%rowtype;
  variance numeric(14, 2);
begin
  select * into session_row from public.pos_sessions
    where number = p_session_number and opened_by = actor_id for update;
  if not found then raise exception 'Sesi POS tidak dapat ditutup oleh pengguna ini';end if;
  if session_row.status in ('Closed','Pending Approval') and session_row.counted_cash=p_counted_cash and coalesce(session_row.variance_reason,'')=coalesce(p_variance_reason,'') then return p_session_number;end if;
  if session_row.status<>'Open' then raise exception 'Sesi POS sudah ditutup atau menunggu persetujuan';end if;
  if exists(select 1 from public.pos_holds where session_number=p_session_number and status='Open' and expires_at>now())then raise exception 'Selesaikan atau batalkan Hold aktif sebelum Close Session';end if;
  if p_counted_cash is null or p_counted_cash < 0 then raise exception 'Kas terhitung tidak valid'; end if;
  variance := p_counted_cash - coalesce(session_row.expected_cash, session_row.opening_cash);
  if variance <> 0 and nullif(trim(p_variance_reason), '') is null then raise exception 'Alasan wajib untuk selisih kas'; end if;
  update public.pos_sessions set
    counted_cash = p_counted_cash,
    cash_difference = variance,
    variance_reason = p_variance_reason,
    status = case when variance = 0 then 'Closed' else 'Pending Approval' end,
    closed_at = case when variance = 0 then now() else null end,
    approved_by = null
  where number = p_session_number;
  perform public.write_business_audit('close', 'pos_session', p_session_number,
    jsonb_build_object('counted_cash', p_counted_cash, 'difference', variance, 'reason', p_variance_reason));
  return p_session_number;
end;
$$;
create or replace function public.approve_pos_session_variance(p_session_number text) returns text
language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_transaction_role(array['owner']::public.app_role[]);s public.pos_sessions%rowtype;delta numeric;
begin
 select * into s from public.pos_sessions where number=p_session_number for update;
 if not found then raise exception 'Session tidak ditemukan';end if;
 if s.status='Closed' and s.approved_by is not null then return p_session_number;end if;
 if s.status<>'Pending Approval' or nullif(btrim(s.variance_reason),'') is null then raise exception 'Alasan selisih kas dan Pending Approval wajib';end if;
 delta:=s.cash_difference;
 if delta<>0 then perform public.post_business_journal('cash_variance',p_session_number,'cash-variance:'||p_session_number,'Persetujuan selisih kas '||p_session_number,
   jsonb_build_array(jsonb_build_object('account_code','1101','debit',greatest(delta,0),'credit',greatest(-delta,0)),jsonb_build_object('account_code','6101','debit',greatest(-delta,0),'credit',greatest(delta,0))));end if;
 update public.pos_sessions set status='Closed',closed_at=now(),approved_by=actor where number=p_session_number;
 perform public.write_business_audit('approve_variance','pos_session',p_session_number,jsonb_build_object('difference',delta,'reason',s.variance_reason));return p_session_number;
end; $$;

create function public.create_vendor_bill_for_quantity(p_purchase_order_number text,p_quantity integer,p_idempotency_key text) returns text
language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_transaction_role(array['finance','owner']::public.app_role[]);available integer;prior text;
begin
 perform public.lock_transaction_key(p_idempotency_key);
 select number into prior from public.vendor_bills where source_document=p_purchase_order_number||':'||p_idempotency_key;
 if prior is not null then
  if (select coalesce(sum(quantity),0) from public.vendor_bill_lines where bill_number=prior)<>p_quantity then raise exception 'Replay Bill memiliki Quantity berbeda';end if;return prior;
 end if;
 perform 1 from public.purchase_orders where number=p_purchase_order_number for update;
 select coalesce(sum(received_quantity-billed_quantity),0)::integer into available from public.purchase_order_lines where purchase_order_number=p_purchase_order_number;
 if p_quantity is null or p_quantity<=0 or p_quantity<>available then raise exception 'Three-way match: quantity Bill % harus sama dengan Accepted belum ditagih %; selisih ditahan',p_quantity,available;end if;
 return public.create_vendor_bill(p_purchase_order_number,p_idempotency_key);
end; $$;
create function public.save_vendor_price(p_vendor_id text,p_sku text,p_minimum_quantity integer,p_purchase_price numeric,p_purchase_tax text,p_idempotency_key text) returns text
language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_transaction_role(array['procurement','owner']::public.app_role[]);ref text;payload jsonb:=jsonb_build_array(p_vendor_id,p_sku,p_minimum_quantity,p_purchase_price,p_purchase_tax);
begin
 ref:=public._workflow_replay(p_idempotency_key,'vendor_price',payload);if ref is not null then return ref;end if;
 if p_minimum_quantity is null or p_minimum_quantity<=0 or p_purchase_price is null or p_purchase_price<=0 or p_purchase_price::text in ('NaN','Infinity','-Infinity') or p_purchase_tax is distinct from 'BUY0' then raise exception 'Vendor Price, Minimum Quantity dan Purchase Tax tidak valid';end if;
 insert into public.vendor_pricelist(vendor_id,sku,unit,minimum_quantity,purchase_price,purchase_tax) values(p_vendor_id,p_sku,'unit',p_minimum_quantity,p_purchase_price,p_purchase_tax)
 on conflict(vendor_id,sku)do update set minimum_quantity=excluded.minimum_quantity,purchase_price=excluded.purchase_price,purchase_tax=excluded.purchase_tax;
 ref:=p_vendor_id||':'||p_sku;perform public._workflow_record(p_idempotency_key,'vendor_price',payload,ref);perform public.write_business_audit('update_price','vendor',p_vendor_id,jsonb_build_object('sku',p_sku,'purchase_price',p_purchase_price));return ref;
end; $$;

revoke all on function public.create_vendor_bill_for_quantity(text,integer,text) from public,anon;
grant execute on function public.create_vendor_bill_for_quantity(text,integer,text) to authenticated;

revoke all on function public.save_vendor_price(text,text,integer,numeric,text,text) from public,anon;
grant execute on function public.save_vendor_price(text,text,integer,numeric,text,text) to authenticated;

revoke all on function public.approve_pos_session_variance(text) from public,anon;
grant execute on function public.approve_pos_session_variance(text) to authenticated;

revoke all on function public.open_pos_session(numeric,text) from public,anon;
grant execute on function public.open_pos_session(numeric,text) to authenticated;

revoke all on function public.close_pos_session(text,numeric,text) from public,anon;
grant execute on function public.close_pos_session(text,numeric,text) to authenticated;
notify pgrst,'reload schema';



-- MIGRATION: 202611070018_receipt_replay_identifier.sql
-- Replay must resolve the local reference, not a joined column with the same name.

create or replace function public.receive_purchase_order(
  p_purchase_order_number text,
  p_accepted_quantity integer,
  p_rejected_quantity integer,
  p_idempotency_key text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := public.require_transaction_role(array['warehouse', 'owner']::public.app_role[]);
  po_row public.purchase_orders%rowtype;
  line_row public.purchase_order_lines%rowtype;
  stock_row public.stock_balances%rowtype;
  new_receipt_number text;
  accepted_value numeric(14, 2);
begin
  if coalesce(p_accepted_quantity, 0) < 0 or coalesce(p_rejected_quantity, 0) < 0
     or coalesce(p_accepted_quantity, 0) + coalesce(p_rejected_quantity, 0) = 0
     or p_idempotency_key is null then raise exception 'Jumlah accepted/rejected dan idempotency key tidak valid'; end if;
  perform public.lock_transaction_key(p_idempotency_key);
  select gr.number into new_receipt_number from public.goods_receipts gr where gr.idempotency_key = p_idempotency_key;
  if new_receipt_number is not null then
    if not exists (
      select 1 from public.goods_receipts gr
      join public.goods_receipt_lines grl on grl.receipt_number = gr.number
      where gr.number = new_receipt_number and gr.purchase_order_number = p_purchase_order_number
        and grl.accepted_quantity = p_accepted_quantity
        and grl.rejected_quantity = p_rejected_quantity
    ) then raise exception 'Idempotency key sudah digunakan untuk penerimaan berbeda'; end if;
    return new_receipt_number;
  end if;
  select * into po_row from public.purchase_orders where number = p_purchase_order_number for update;
  if not found or po_row.status not in ('Purchase Order', 'Partial Receipt') then raise exception 'Purchase Order tidak dapat diterima'; end if;
  select * into line_row from public.purchase_order_lines
    where purchase_order_number = p_purchase_order_number for update;
  if line_row.received_quantity + line_row.rejected_quantity + p_accepted_quantity + p_rejected_quantity > line_row.quantity then
    raise exception 'Jumlah penerimaan melebihi sisa kuantitas Purchase Order';
  end if;
  select * into stock_row from public.stock_balances
    where sku = line_row.sku and location_code = po_row.destination_code for update;
  if not found then raise exception 'Saldo lokasi penerimaan tidak ditemukan'; end if;
  new_receipt_number := 'GR' || lpad(nextval('public.receipt_number_seq')::text, 5, '0');
  insert into public.goods_receipts (number, purchase_order_number, idempotency_key, created_by)
  values (new_receipt_number, p_purchase_order_number, p_idempotency_key, actor_id);
  insert into public.goods_receipt_lines (
    receipt_number, purchase_order_line_id, sku, accepted_quantity, rejected_quantity
  ) values (
    new_receipt_number, line_row.id, line_row.sku, p_accepted_quantity, p_rejected_quantity
  );
  update public.purchase_order_lines set
    received_quantity = received_quantity + p_accepted_quantity,
    rejected_quantity = rejected_quantity + p_rejected_quantity
  where id = line_row.id;
  update public.stock_balances set on_hand = on_hand + p_accepted_quantity
    where sku = line_row.sku and location_code = po_row.destination_code;
  accepted_value := p_accepted_quantity * line_row.unit_price;
  if p_accepted_quantity > 0 then
    perform public.post_business_journal(
      'goods_receipt', new_receipt_number, 'receipt:' || p_idempotency_key,
      'Penerimaan baik ' || p_purchase_order_number,
      jsonb_build_array(
        jsonb_build_object('account_code', '1301', 'debit', accepted_value, 'credit', 0),
        jsonb_build_object('account_code', '2103', 'debit', 0, 'credit', accepted_value)
      )
    );
  end if;
  if line_row.received_quantity + line_row.rejected_quantity + p_accepted_quantity + p_rejected_quantity = line_row.quantity then
    update public.purchase_orders set status = 'Received' where number = p_purchase_order_number;
  else
    update public.purchase_orders set status = 'Partial Receipt' where number = p_purchase_order_number;
  end if;
  perform public.write_business_audit('receive', 'goods_receipt', new_receipt_number,
    jsonb_build_object('purchase_order', p_purchase_order_number, 'accepted', p_accepted_quantity, 'rejected', p_rejected_quantity));
  return new_receipt_number;
end;
$$;



commit;