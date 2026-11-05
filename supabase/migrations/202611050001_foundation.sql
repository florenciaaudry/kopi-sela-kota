create type public.app_role as enum (
  'sales',
  'warehouse',
  'procurement',
  'finance',
  'cashier',
  'owner'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.app_role not null,
  created_at timestamptz not null default now()
);

create function public.has_app_role(allowed_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = any (allowed_roles)
  );
$$;

revoke all on function public.has_app_role(public.app_role[]) from public;
grant execute on function public.has_app_role(public.app_role[]) to authenticated;

create table public.payment_terms (
  code text primary key,
  name text not null,
  days integer not null check (days >= 0),
  rule text not null
);

create table public.customers (
  id text primary key,
  name text not null,
  type text not null check (type in ('Perusahaan', 'Perorangan')),
  city text not null,
  credit_limit numeric(14, 2) not null check (credit_limit >= 0),
  payment_terms_code text not null references public.payment_terms (code)
);

create table public.vendors (
  id text primary key,
  name text not null,
  city text not null,
  payment_terms_code text not null references public.payment_terms (code),
  tax_profile text not null
);

create table public.products (
  sku text primary key,
  name text not null,
  size text not null,
  color text not null,
  unit text not null check (unit = 'unit'),
  sales_price numeric(14, 2) not null check (sales_price >= 0),
  default_vendor_id text not null references public.vendors (id),
  unique (name, size)
);

create table public.product_costs (
  sku text primary key references public.products (sku),
  standard_cost numeric(14, 2) not null check (standard_cost >= 0)
);

create table public.vendor_pricelist (
  vendor_id text not null references public.vendors (id),
  sku text not null references public.products (sku),
  unit text not null check (unit = 'unit'),
  minimum_quantity integer not null check (minimum_quantity > 0),
  purchase_price numeric(14, 2) not null check (purchase_price >= 0),
  purchase_tax text not null,
  primary key (vendor_id, sku)
);

create table public.locations (
  code text primary key,
  name text not null,
  type text not null,
  company text not null
);

create table public.stock_balances (
  sku text not null references public.products (sku),
  location_code text not null references public.locations (code),
  on_hand integer not null check (on_hand >= 0),
  primary key (sku, location_code)
);

create table public.leads (
  number text primary key,
  customer_id text not null references public.customers (id),
  sku text not null references public.products (sku),
  quantity integer not null check (quantity > 0),
  stage text not null,
  expected_revenue numeric(14, 2) not null check (expected_revenue >= 0),
  probability_percent numeric(5, 2) not null check (probability_percent between 0 and 100),
  lost_reason text,
  created_at timestamptz not null default now()
);

create table public.sales_orders (
  number text primary key,
  customer_id text not null references public.customers (id),
  source_lead_number text references public.leads (number),
  status text not null,
  order_date date not null,
  location_code text not null references public.locations (code),
  discount_percent numeric(5, 2) not null default 0 check (discount_percent between 0 and 10),
  subtotal numeric(14, 2) not null check (subtotal >= 0),
  tax_total numeric(14, 2) not null check (tax_total >= 0),
  total numeric(14, 2) not null check (total = subtotal + tax_total),
  locked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.sales_order_lines (
  id uuid primary key default gen_random_uuid(),
  sales_order_number text not null references public.sales_orders (number) on delete restrict,
  sku text not null references public.products (sku),
  quantity integer not null check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  discount_percent numeric(5, 2) not null check (discount_percent between 0 and 10),
  tax_code text not null,
  subtotal numeric(14, 2) not null check (subtotal >= 0),
  tax_amount numeric(14, 2) not null check (tax_amount >= 0),
  unique (sales_order_number, sku)
);

create table public.purchase_orders (
  number text primary key,
  vendor_id text not null references public.vendors (id),
  status text not null,
  order_date date not null,
  destination_code text not null references public.locations (code),
  total numeric(14, 2) not null check (total >= 0),
  locked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_number text not null references public.purchase_orders (number) on delete restrict,
  sku text not null references public.products (sku),
  quantity integer not null check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  purchase_tax text not null,
  unique (purchase_order_number, sku)
);

create table public.customer_invoices (
  number text primary key,
  customer_id text not null references public.customers (id),
  source_document text,
  status text not null,
  issue_date date,
  due_date date not null,
  subtotal numeric(14, 2) not null check (subtotal >= 0),
  tax_total numeric(14, 2) not null check (tax_total >= 0),
  total numeric(14, 2) not null check (total = subtotal + tax_total),
  amount_paid numeric(14, 2) not null default 0 check (amount_paid between 0 and total),
  is_opening_balance boolean not null default false
);

create table public.vendor_bills (
  number text primary key,
  vendor_id text not null references public.vendors (id),
  source_document text,
  status text not null,
  issue_date date,
  due_date date not null,
  subtotal numeric(14, 2) not null check (subtotal >= 0),
  tax_total numeric(14, 2) not null check (tax_total >= 0),
  total numeric(14, 2) not null check (total = subtotal + tax_total),
  amount_paid numeric(14, 2) not null default 0 check (amount_paid between 0 and total),
  is_opening_balance boolean not null default false
);

create table public.chart_of_accounts (
  code text primary key,
  name text not null,
  type text not null
);

create table public.tax_rates (
  id text primary key,
  name text not null,
  rate numeric(5, 2) not null check (rate >= 0),
  base text not null,
  rounding text not null,
  account_code text references public.chart_of_accounts (code)
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  source_type text not null,
  source_reference text not null,
  idempotency_key text not null unique,
  entry_date date not null,
  memo text not null,
  status text not null check (status in ('draft', 'posted', 'reversed')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (source_type, source_reference)
);

create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries (id) on delete restrict,
  account_code text not null references public.chart_of_accounts (code),
  debit numeric(14, 2) not null default 0 check (debit >= 0),
  credit numeric(14, 2) not null default 0 check (credit >= 0),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);

create function public.assert_posted_journal_balanced()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  debit_total numeric(14, 2);
  credit_total numeric(14, 2);
begin
  if new.status = 'posted' then
    select coalesce(sum(jl.debit), 0), coalesce(sum(jl.credit), 0)
      into debit_total, credit_total
      from public.journal_lines jl
      where jl.journal_entry_id = new.id;

    if debit_total = 0 or debit_total <> credit_total then
      raise exception 'Journal % must have equal, non-zero debit and credit totals', new.number;
    end if;
  end if;
  return new;
end;
$$;

create trigger journal_must_balance_before_post
before insert or update of status on public.journal_entries
for each row execute function public.assert_posted_journal_balanced();

create function public.prevent_posted_journal_line_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  entry_status text;
  entry_id uuid;
begin
  if tg_op = 'DELETE' then
    entry_id := old.journal_entry_id;
  else
    entry_id := new.journal_entry_id;
  end if;

  select je.status into entry_status
    from public.journal_entries je
    where je.id = entry_id;

  if entry_status in ('posted', 'reversed') then
    raise exception 'Posted or reversed journal lines are immutable; create a reversal instead';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger journal_lines_immutable_after_post
before insert or update or delete on public.journal_lines
for each row execute function public.prevent_posted_journal_line_changes();

create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  sku text not null references public.products (sku),
  location_code text not null references public.locations (code),
  source_type text not null check (source_type in ('sales_order', 'pos_hold')),
  source_reference text not null,
  quantity integer not null check (quantity > 0),
  status text not null check (status in ('active', 'released', 'consumed', 'expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (source_type, source_reference, sku, location_code)
);

create view public.inventory_availability
with (security_invoker = true)
as
select
  sb.sku,
  sb.location_code,
  sb.on_hand,
  coalesce(sum(ir.quantity) filter (where ir.status = 'active'), 0)::integer as reserved,
  sb.on_hand - coalesce(sum(ir.quantity) filter (where ir.status = 'active'), 0)::integer as available
from public.stock_balances sb
left join public.inventory_reservations ir
  on ir.sku = sb.sku and ir.location_code = sb.location_code
group by sb.sku, sb.location_code, sb.on_hand;

create table public.pos_configuration (
  id text primary key,
  location_code text not null references public.locations (code),
  counter text not null,
  opening_cash numeric(14, 2) not null check (opening_cash >= 0),
  cash_account_code text not null references public.chart_of_accounts (code),
  bank_account_code text not null references public.chart_of_accounts (code),
  service_charge_percent numeric(5, 2) not null check (service_charge_percent = 0)
);

create table public.pos_payment_methods (
  id text primary key,
  name text not null,
  account_code text not null references public.chart_of_accounts (code),
  settlement text not null
);

create table public.pos_sessions (
  number text primary key,
  cashier_label text not null,
  status text not null,
  opening_cash numeric(14, 2) not null check (opening_cash >= 0),
  opened_at timestamptz,
  closed_at timestamptz
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id),
  actor_label text not null,
  action text not null,
  document_type text not null,
  document_number text not null,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index sales_orders_customer_idx on public.sales_orders (customer_id, order_date);
create index purchase_orders_vendor_idx on public.purchase_orders (vendor_id, order_date);
create index invoices_customer_due_idx on public.customer_invoices (customer_id, due_date);
create index bills_vendor_due_idx on public.vendor_bills (vendor_id, due_date);
create index journal_entries_date_idx on public.journal_entries (entry_date, status);
create index audit_events_document_idx on public.audit_events (document_type, document_number, occurred_at desc);

alter table public.profiles enable row level security;
alter table public.payment_terms enable row level security;
alter table public.customers enable row level security;
alter table public.vendors enable row level security;
alter table public.products enable row level security;
alter table public.product_costs enable row level security;
alter table public.vendor_pricelist enable row level security;
alter table public.locations enable row level security;
alter table public.stock_balances enable row level security;
alter table public.leads enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_lines enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;
alter table public.customer_invoices enable row level security;
alter table public.vendor_bills enable row level security;
alter table public.chart_of_accounts enable row level security;
alter table public.tax_rates enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.pos_configuration enable row level security;
alter table public.pos_payment_methods enable row level security;
alter table public.pos_sessions enable row level security;
alter table public.audit_events enable row level security;

create policy "Profiles readable by self or Owner"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.has_app_role(array['owner']::public.app_role[]));
create policy "Payment terms readable by signed-in staff"
on public.payment_terms for select to authenticated
using (public.has_app_role(array['sales', 'warehouse', 'procurement', 'finance', 'cashier', 'owner']::public.app_role[]));

create policy "Customers readable by signed-in staff"
on public.customers for select to authenticated
using (public.has_app_role(array['sales', 'warehouse', 'procurement', 'finance', 'cashier', 'owner']::public.app_role[]));

create policy "Vendors readable by signed-in staff"
on public.vendors for select to authenticated
using (public.has_app_role(array['sales', 'warehouse', 'procurement', 'finance', 'cashier', 'owner']::public.app_role[]));

create policy "Products readable by signed-in staff"
on public.products for select to authenticated
using (public.has_app_role(array['sales', 'warehouse', 'procurement', 'finance', 'cashier', 'owner']::public.app_role[]));

create policy "Product costs readable by authorized roles"
on public.product_costs for select to authenticated
using (public.has_app_role(array['warehouse', 'procurement', 'finance', 'owner']::public.app_role[]));

create policy "Vendor prices readable by signed-in staff"
on public.vendor_pricelist for select to authenticated
using (public.has_app_role(array['procurement', 'finance', 'owner']::public.app_role[]));

create policy "Locations readable by signed-in staff"
on public.locations for select to authenticated
using (public.has_app_role(array['sales', 'warehouse', 'procurement', 'finance', 'cashier', 'owner']::public.app_role[]));
create policy "Stock balances readable by signed-in staff"
on public.stock_balances for select to authenticated
using (public.has_app_role(array['warehouse', 'procurement', 'owner']::public.app_role[]));
create policy "Inventory reservations readable by signed-in staff"
on public.inventory_reservations for select to authenticated
using (public.has_app_role(array['warehouse', 'procurement', 'owner']::public.app_role[]));
create policy "Leads visible to Sales and Owner"
on public.leads for select to authenticated
using (public.has_app_role(array['sales', 'owner']::public.app_role[]));
create policy "Sales orders visible to involved operational roles"
on public.sales_orders for select to authenticated
using (public.has_app_role(array['sales', 'warehouse', 'finance', 'owner']::public.app_role[]));
create policy "Sales order lines visible to involved operational roles"
on public.sales_order_lines for select to authenticated
using (public.has_app_role(array['sales', 'warehouse', 'finance', 'owner']::public.app_role[]));
create policy "Purchase orders visible to involved operational roles"
on public.purchase_orders for select to authenticated
using (public.has_app_role(array['procurement', 'warehouse', 'finance', 'owner']::public.app_role[]));
create policy "Purchase order lines visible to involved operational roles"
on public.purchase_order_lines for select to authenticated
using (public.has_app_role(array['procurement', 'warehouse', 'finance', 'owner']::public.app_role[]));
create policy "Customer invoices visible to Finance and Owner"
on public.customer_invoices for select to authenticated
using (public.has_app_role(array['sales', 'finance', 'owner']::public.app_role[]));
create policy "Vendor bills visible to Finance and Owner"
on public.vendor_bills for select to authenticated
using (public.has_app_role(array['finance', 'owner']::public.app_role[]));
create policy "Accounts readable by Finance and Owner"
on public.chart_of_accounts for select to authenticated
using (public.has_app_role(array['finance', 'owner']::public.app_role[]));
create policy "Taxes readable by signed-in staff"
on public.tax_rates for select to authenticated
using (public.has_app_role(array['sales', 'warehouse', 'procurement', 'finance', 'cashier', 'owner']::public.app_role[]));
create policy "Journal entries visible to Finance and Owner"
on public.journal_entries for select to authenticated
using (public.has_app_role(array['finance', 'owner']::public.app_role[]));
create policy "Journal lines visible to Finance and Owner"
on public.journal_lines for select to authenticated
using (public.has_app_role(array['finance', 'owner']::public.app_role[]));
create policy "POS configuration readable by Cashier and Owner"
on public.pos_configuration for select to authenticated
using (public.has_app_role(array['cashier', 'owner']::public.app_role[]));
create policy "POS payment methods readable by Cashier and Owner"
on public.pos_payment_methods for select to authenticated
using (public.has_app_role(array['cashier', 'owner']::public.app_role[]));
create policy "POS sessions visible to Cashier and Owner"
on public.pos_sessions for select to authenticated
using (public.has_app_role(array['cashier', 'owner']::public.app_role[]));
create policy "Audit events visible to Finance and Owner"
on public.audit_events for select to authenticated
using (public.has_app_role(array['finance', 'owner']::public.app_role[]));

revoke all on table
  public.profiles,
  public.payment_terms,
  public.customers,
  public.vendors,
  public.products,
  public.product_costs,
  public.vendor_pricelist,
  public.locations,
  public.stock_balances,
  public.leads,
  public.sales_orders,
  public.sales_order_lines,
  public.purchase_orders,
  public.purchase_order_lines,
  public.customer_invoices,
  public.vendor_bills,
  public.chart_of_accounts,
  public.tax_rates,
  public.journal_entries,
  public.journal_lines,
  public.inventory_reservations,
  public.pos_configuration,
  public.pos_payment_methods,
  public.pos_sessions,
  public.audit_events
from anon, authenticated;

revoke all on table public.inventory_availability from anon, authenticated;

grant select on table
  public.profiles,
  public.payment_terms,
  public.customers,
  public.vendors,
  public.products,
  public.product_costs,
  public.vendor_pricelist,
  public.locations,
  public.stock_balances,
  public.leads,
  public.sales_orders,
  public.sales_order_lines,
  public.purchase_orders,
  public.purchase_order_lines,
  public.customer_invoices,
  public.vendor_bills,
  public.chart_of_accounts,
  public.tax_rates,
  public.journal_entries,
  public.journal_lines,
  public.inventory_reservations,
  public.pos_configuration,
  public.pos_payment_methods,
  public.pos_sessions,
  public.audit_events,
  public.inventory_availability
to authenticated;
