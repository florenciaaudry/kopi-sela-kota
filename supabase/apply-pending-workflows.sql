-- Incremental ONLY: migrations 014–018. Requires existing 001–013. No seed/reset.
-- Run complete file ONCE on the existing development project. Atomic: failure rolls back all five.
begin;
-- SOURCE: 202611070014_quotation_rfq_workflows.sql
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

-- SOURCE: 202611070015_master_crud_log_notes.sql
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

-- SOURCE: 202611070016_return_inspection_workflow.sql
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

-- SOURCE: 202611070017_workflow_integrity_controls.sql
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

-- SOURCE: 202611070018_receipt_replay_identifier.sql
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
