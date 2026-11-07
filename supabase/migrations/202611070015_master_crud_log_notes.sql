-- Role-scoped master CRUD and immutable, persistent document Log Notes.
begin;
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
commit;
