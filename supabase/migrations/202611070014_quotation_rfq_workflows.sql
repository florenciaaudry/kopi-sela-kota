-- Incremental workflow completion. No seed/reset; existing posted documents are retained.
begin;
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
commit;
