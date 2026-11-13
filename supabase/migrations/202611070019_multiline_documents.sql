-- Additive multi-Product documents. No seed/reset or changes to posted amounts.
begin;
create table public.quotation_lines(
 quotation_number text not null references public.quotations(number),sku text not null references public.products(sku),
 quantity integer not null check(quantity>0),unit_price numeric(14,2) not null check(unit_price>0),
 discount_percent numeric(5,2) not null check(discount_percent between 0 and 10),subtotal numeric(14,2) not null,tax_amount numeric(14,2) not null,
 primary key(quotation_number,sku)
);
create table public.rfq_lines(
 rfq_number text not null references public.rfqs(number),sku text not null references public.products(sku),quantity integer not null check(quantity>0),
 unit_price numeric(14,2) not null check(unit_price>0),purchase_tax text not null,subtotal numeric(14,2) not null,primary key(rfq_number,sku)
);
insert into public.quotation_lines select number,sku,quantity,unit_price,discount_percent,subtotal,tax_total from public.quotations;
insert into public.rfq_lines select number,sku,quantity,unit_price,purchase_tax,total from public.rfqs;
alter table public.quotation_lines enable row level security;
alter table public.rfq_lines enable row level security;
create policy "Read quotation lines" on public.quotation_lines for select to authenticated using(public.has_app_role(array['sales','owner']::public.app_role[]));
create policy "Read RFQ lines" on public.rfq_lines for select to authenticated using(public.has_app_role(array['procurement','owner']::public.app_role[]));
grant select on public.quotation_lines,public.rfq_lines to authenticated;
revoke insert,update,delete on public.quotation_lines,public.rfq_lines from public,anon,authenticated;

create function public._business_lines(p_lines jsonb,p_mode text) returns jsonb language plpgsql immutable set search_path='' as $$
declare item jsonb;result jsonb:='[]';sku text;q numeric;d numeric;a numeric;r numeric;
begin
 if p_mode not in ('quotation','rfq','delivery','receipt') or jsonb_typeof(p_lines) is distinct from 'array' then raise exception 'Order Lines harus berupa daftar';end if;
 if jsonb_array_length(p_lines) not between 1 and 50 then raise exception 'Order Lines wajib 1 sampai 50 Product';end if;
 for item in select value from jsonb_array_elements(p_lines) loop
  sku:=item->>'sku';if jsonb_typeof(item)<>'object' or sku is null or sku!~'^[A-Z0-9]+(-[A-Z0-9]+)*$' then raise exception 'SKU tidak valid';end if;
  if p_mode='receipt' then
   if coalesce(item->>'accepted_quantity','')!~'^[0-9]+$' or coalesce(item->>'rejected_quantity','')!~'^[0-9]+$' then raise exception 'Accepted/Rejected Quantity harus bilangan bulat nol atau lebih';end if;
   a:=(item->>'accepted_quantity')::numeric;r:=(item->>'rejected_quantity')::numeric;
   if a+r<=0 or a+r>1000000 then raise exception 'Accepted/Rejected Quantity tidak valid';end if;
   result:=result||jsonb_build_array(jsonb_build_object('sku',sku,'accepted_quantity',a::integer,'rejected_quantity',r::integer));
  else
   if coalesce(item->>'quantity','')!~'^[0-9]+$' then raise exception 'Quantity harus bilangan bulat positif';end if;
   q:=(item->>'quantity')::numeric;if q<=0 or q>1000000 then raise exception 'Quantity positif wajib diisi';end if;
   if p_mode='quotation' then
    d:=coalesce((item->>'discount_percent')::numeric,0);if d::text in ('NaN','Infinity','-Infinity') or d<0 or d>10 then raise exception 'Discount 0–10%% wajib diisi';end if;
    result:=result||jsonb_build_array(jsonb_build_object('sku',sku,'quantity',q::integer,'discount_percent',d));
   else result:=result||jsonb_build_array(jsonb_build_object('sku',sku,'quantity',q::integer));end if;
  end if;
 end loop;
 if (select count(*)<>count(distinct value->>'sku') from jsonb_array_elements(result)) then raise exception 'SKU duplikat ditolak; gabungkan Quantity pada satu baris';end if;
 return (select jsonb_agg(value order by value->>'sku') from jsonb_array_elements(result));
end;$$;

create function public.deliver_sales_order_lines(p_sales_order_number text,p_lines jsonb,p_idempotency_key text)returns text language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_transaction_role(array['warehouse','owner']::public.app_role[]);lines jsonb:=public._business_lines(p_lines,'delivery');payload jsonb;ref text;old public.delivery_notes%rowtype;o public.sales_orders%rowtype;item record;l public.sales_order_lines%rowtype;r public.inventory_reservations%rowtype;remaining integer;hand integer;cost numeric;total_cost numeric:=0;
begin
 payload:=jsonb_build_array(p_sales_order_number,lines);ref:=public._workflow_replay(p_idempotency_key,'delivery_lines',payload);if ref is not null then return ref;end if;
 select * into old from public.delivery_notes where idempotency_key=p_idempotency_key;
 if found then
  if old.sales_order_number<>p_sales_order_number or old.created_by<>actor or lines is distinct from(select jsonb_agg(jsonb_build_object('sku',sku,'quantity',quantity)order by sku)from public.delivery_note_lines where delivery_number=old.number)then raise exception 'Replay Delivery berbeda';end if;return old.number;
 end if;
 select * into o from public.sales_orders where number=p_sales_order_number for update;if not found or o.status not in ('Sales Order','Partial Delivery')then raise exception 'Sales Order tidak dapat dikirim';end if;
 ref:='DN'||lpad(nextval('public.delivery_number_seq')::text,5,'0');insert into public.delivery_notes(number,sales_order_number,idempotency_key,created_by)values(ref,p_sales_order_number,p_idempotency_key,actor);
 for item in select * from jsonb_to_recordset(lines)as x(sku text,quantity integer)order by sku loop
  select * into l from public.sales_order_lines where sales_order_number=p_sales_order_number and sku=item.sku for update;if not found then raise exception 'Product % bukan bagian Sales Order',item.sku;end if;
  select l.quantity-coalesce(sum(quantity),0)into remaining from public.delivery_note_lines where sales_order_line_id=l.id;
  select * into r from public.inventory_reservations where source_type='sales_order'and source_reference=p_sales_order_number and sku=item.sku and location_code=o.location_code for update;
  if not found or r.status<>'active'or item.quantity>r.quantity or item.quantity>remaining then raise exception 'Kuantitas melebihi sisa pesanan atau reservasi aktif';end if;
  select on_hand into hand from public.stock_balances where sku=item.sku and location_code=o.location_code for update;if not found or hand<item.quantity then raise exception 'On Hand gudang tidak mencukupi';end if;
  select standard_cost into cost from public.product_costs where sku=item.sku;if cost is null then raise exception 'Standard Cost tidak ditemukan';end if;
  insert into public.delivery_note_lines(delivery_number,sales_order_line_id,sku,quantity)values(ref,l.id,item.sku,item.quantity);
  update public.stock_balances set on_hand=on_hand-item.quantity where sku=item.sku and location_code=o.location_code;
  update public.inventory_reservations set quantity=case when quantity=item.quantity then quantity else quantity-item.quantity end,status=case when quantity=item.quantity then 'consumed'else 'active'end where id=r.id;
  total_cost:=total_cost+cost*item.quantity;
 end loop;
 if total_cost>0 then perform public.post_business_journal('delivery',ref,'delivery:'||p_idempotency_key,'HPP pengiriman '||p_sales_order_number,jsonb_build_array(jsonb_build_object('account_code','5101','debit',total_cost,'credit',0),jsonb_build_object('account_code','1301','debit',0,'credit',total_cost)));end if;
 update public.sales_orders set status=case when exists(select 1 from public.sales_order_lines sol where sol.sales_order_number=p_sales_order_number and sol.quantity>coalesce((select sum(dnl.quantity)from public.delivery_note_lines dnl where dnl.sales_order_line_id=sol.id),0))then 'Partial Delivery'else 'Delivered'end where number=p_sales_order_number;
 perform public._workflow_record(p_idempotency_key,'delivery_lines',payload,ref);perform public.write_business_audit('deliver','delivery',ref,jsonb_build_object('sales_order',p_sales_order_number,'lines',lines));return ref;
end;$$;
create or replace function public.deliver_sales_order(p_sales_order_number text,p_quantity integer,p_idempotency_key text)returns text language plpgsql security definer set search_path='' as $$
declare sku_ref text;begin
 perform public.require_transaction_role(array['warehouse','owner']::public.app_role[]);
 if(select count(*)from public.sales_order_lines where sales_order_number=p_sales_order_number)<>1 then raise exception 'Buka Sales Order dan isi Done Quantity per Product';end if;
 select sku into sku_ref from public.sales_order_lines where sales_order_number=p_sales_order_number;
 return public.deliver_sales_order_lines(p_sales_order_number,jsonb_build_array(jsonb_build_object('sku',sku_ref,'quantity',p_quantity)),p_idempotency_key);
end;$$;

create function public.receive_purchase_order_lines(p_purchase_order_number text,p_lines jsonb,p_idempotency_key text)returns text language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_transaction_role(array['warehouse','owner']::public.app_role[]);lines jsonb:=public._business_lines(p_lines,'receipt');payload jsonb;ref text;old public.goods_receipts%rowtype;o public.purchase_orders%rowtype;item record;l public.purchase_order_lines%rowtype;total_value numeric:=0;
begin
 payload:=jsonb_build_array(p_purchase_order_number,lines);ref:=public._workflow_replay(p_idempotency_key,'receipt_lines',payload);if ref is not null then return ref;end if;
 select * into old from public.goods_receipts where idempotency_key=p_idempotency_key;if found then
  if old.purchase_order_number<>p_purchase_order_number or old.created_by<>actor or lines is distinct from(select jsonb_agg(jsonb_build_object('sku',sku,'accepted_quantity',accepted_quantity,'rejected_quantity',rejected_quantity)order by sku)from public.goods_receipt_lines where receipt_number=old.number)then raise exception 'Replay Receipt berbeda';end if;return old.number;
 end if;
 select * into o from public.purchase_orders where number=p_purchase_order_number for update;if not found or o.status not in ('Purchase Order','Partial Receipt')then raise exception 'Purchase Order tidak dapat diterima';end if;
 ref:='GR'||lpad(nextval('public.receipt_number_seq')::text,5,'0');insert into public.goods_receipts(number,purchase_order_number,idempotency_key,created_by)values(ref,p_purchase_order_number,p_idempotency_key,actor);
 for item in select * from jsonb_to_recordset(lines)as x(sku text,accepted_quantity integer,rejected_quantity integer)order by sku loop
  select * into l from public.purchase_order_lines where purchase_order_number=p_purchase_order_number and sku=item.sku for update;if not found then raise exception 'Product % bukan bagian Purchase Order',item.sku;end if;
  if l.received_quantity+l.rejected_quantity+item.accepted_quantity+item.rejected_quantity>l.quantity then raise exception 'Jumlah penerimaan melebihi sisa kuantitas Purchase Order';end if;
  perform 1 from public.stock_balances where sku=item.sku and location_code=o.destination_code for update;if not found then raise exception 'Saldo lokasi penerimaan tidak ditemukan';end if;
  insert into public.goods_receipt_lines(receipt_number,purchase_order_line_id,sku,accepted_quantity,rejected_quantity)values(ref,l.id,item.sku,item.accepted_quantity,item.rejected_quantity);
  update public.purchase_order_lines set received_quantity=received_quantity+item.accepted_quantity,rejected_quantity=rejected_quantity+item.rejected_quantity where id=l.id;
  update public.stock_balances set on_hand=on_hand+item.accepted_quantity where sku=item.sku and location_code=o.destination_code;
  total_value:=total_value+item.accepted_quantity*l.unit_price;
 end loop;
 if total_value>0 then perform public.post_business_journal('goods_receipt',ref,'receipt:'||p_idempotency_key,'Penerimaan baik '||p_purchase_order_number,jsonb_build_array(jsonb_build_object('account_code','1301','debit',total_value,'credit',0),jsonb_build_object('account_code','2103','debit',0,'credit',total_value)));end if;
 update public.purchase_orders set status=case when exists(select 1 from public.purchase_order_lines where purchase_order_number=p_purchase_order_number and received_quantity+rejected_quantity<quantity)then 'Partial Receipt'else 'Received'end where number=p_purchase_order_number;
 perform public._workflow_record(p_idempotency_key,'receipt_lines',payload,ref);perform public.write_business_audit('receive','goods_receipt',ref,jsonb_build_object('purchase_order',p_purchase_order_number,'lines',lines));return ref;
end;$$;
create or replace function public.receive_purchase_order(p_purchase_order_number text,p_accepted_quantity integer,p_rejected_quantity integer,p_idempotency_key text)returns text language plpgsql security definer set search_path='' as $$
declare sku_ref text;begin
 perform public.require_transaction_role(array['warehouse','owner']::public.app_role[]);
 if(select count(*)from public.purchase_order_lines where purchase_order_number=p_purchase_order_number)<>1 then raise exception 'Buka Purchase Order dan isi Accepted/Rejected per Product';end if;
 select sku into sku_ref from public.purchase_order_lines where purchase_order_number=p_purchase_order_number;
 return public.receive_purchase_order_lines(p_purchase_order_number,jsonb_build_array(jsonb_build_object('sku',sku_ref,'accepted_quantity',p_accepted_quantity,'rejected_quantity',p_rejected_quantity)),p_idempotency_key);
end;$$;

create or replace function public.create_vendor_bill(p_purchase_order_number text,p_idempotency_key text)returns text language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_transaction_role(array['finance','owner']::public.app_role[]);o public.purchase_orders%rowtype;l public.purchase_order_lines%rowtype;new_bill text;amount numeric;total_amount numeric:=0;qty integer;days_due integer;
begin
 perform public.lock_transaction_key(p_idempotency_key);select number into new_bill from public.vendor_bills where source_document=p_purchase_order_number||':'||p_idempotency_key;if new_bill is not null then return new_bill;end if;
 select * into o from public.purchase_orders where number=p_purchase_order_number for update;if not found then raise exception 'Purchase Order tidak ditemukan';end if;
 for l in select * from public.purchase_order_lines where purchase_order_number=p_purchase_order_number order by sku for update loop total_amount:=total_amount+(l.received_quantity-l.billed_quantity)*l.unit_price;end loop;
 if total_amount<=0 then raise exception 'Tidak ada barang diterima-baik yang belum ditagih';end if;
 select pt.days into days_due from public.vendors v join public.payment_terms pt on pt.code=v.payment_terms_code where v.id=o.vendor_id;
 new_bill:='BILL'||lpad(nextval('public.vendor_bill_number_seq')::text,5,'0');insert into public.vendor_bills(number,vendor_id,source_document,status,issue_date,due_date,subtotal,tax_total,total,amount_paid)values(new_bill,o.vendor_id,p_purchase_order_number||':'||p_idempotency_key,'Posted',(now()at time zone'Asia/Jakarta')::date,(now()at time zone'Asia/Jakarta')::date+days_due,total_amount,0,total_amount,0);
 for l in select * from public.purchase_order_lines where purchase_order_number=p_purchase_order_number order by sku for update loop
  qty:=l.received_quantity-l.billed_quantity;if qty>0 then
   amount:=qty*l.unit_price;insert into public.vendor_bill_lines(bill_number,purchase_order_line_id,sku,quantity,unit_price,subtotal)values(new_bill,l.id,l.sku,qty,l.unit_price,amount);update public.purchase_order_lines set billed_quantity=billed_quantity+qty where id=l.id;
  end if;
 end loop;
 perform public.post_business_journal('vendor_bill',new_bill,'vendor-bill:'||p_purchase_order_number||':'||p_idempotency_key,'Tagihan pemasok '||p_purchase_order_number,jsonb_build_array(jsonb_build_object('account_code','2103','debit',total_amount,'credit',0),jsonb_build_object('account_code','2101','debit',0,'credit',total_amount)));
 perform public.write_business_audit('bill','vendor_bill',new_bill,jsonb_build_object('purchase_order',p_purchase_order_number,'total',total_amount));return new_bill;
end;$$;
revoke all on function public._business_lines(jsonb,text) from public,anon,authenticated;

create function public.save_quotation_lines(p_number text,p_customer_id text,p_lines jsonb,p_source_lead_number text,p_expected_revision integer,p_idempotency_key text) returns text
language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_transaction_role(array['sales','owner']::public.app_role[]);lines jsonb:=public._business_lines(p_lines,'quotation');
 ref text;q public.quotations%rowtype;item record;price numeric;net numeric;tax numeric;rate numeric;sum_net numeric:=0;sum_tax numeric:=0;max_discount numeric:=0;payload jsonb;
begin
 payload:=jsonb_build_array(p_number,p_customer_id,lines,p_source_lead_number,p_expected_revision);ref:=public._workflow_replay(p_idempotency_key,'save_quotation_lines',payload);if ref is not null then return ref;end if;
 if not exists(select 1 from public.customers where id=p_customer_id)then raise exception 'Customer tidak ditemukan';end if;
 if p_source_lead_number is not null and not exists(select 1 from public.leads where number=p_source_lead_number and customer_id=p_customer_id and stage in ('Qualified','Proposition','Won'))then raise exception 'Peluang sumber tidak memenuhi syarat';end if;
 select t.rate into rate from public.tax_rates t where id='PBJT10';if rate is null then raise exception 'PBJT belum dikonfigurasi';end if;
 if p_number is not null then
  select * into q from public.quotations where number=p_number for update;
  if not found or q.status in ('Confirmed','Cancelled')then raise exception 'Quotation terkunci atau tidak ditemukan';end if;
  if p_expected_revision is null or q.revision<>p_expected_revision then raise exception 'Quotation sudah berubah; muat ulang';end if;ref:=p_number;
 else ref:='Q'||lpad(nextval('public.quotation_number_seq')::text,5,'0');end if;
 for item in select * from jsonb_to_recordset(lines) as x(sku text,quantity integer,discount_percent numeric) loop
  select sales_price into price from public.products where sku=item.sku for share;if price is null or price<=0 then raise exception 'Product % atau Sales Price tidak valid',item.sku;end if;
  net:=round(price*item.quantity*(1-item.discount_percent/100),0);tax:=round(net*rate/100,0);sum_net:=sum_net+net;sum_tax:=sum_tax+tax;max_discount:=greatest(max_discount,item.discount_percent);
 end loop;
 select p.sales_price into price from public.products p where p.sku=lines->0->>'sku';
 if p_number is null then
  insert into public.quotations(number,customer_id,sku,quantity,unit_price,discount_percent,tax_rate,subtotal,tax_total,total,source_lead_number,status,created_by)
  values(ref,p_customer_id,lines->0->>'sku',(lines->0->>'quantity')::integer,price,max_discount,rate,sum_net,sum_tax,sum_net+sum_tax,p_source_lead_number,case when max_discount>5 then 'Pending Approval' else 'Quotation' end,actor);
 else
  update public.quotations set customer_id=p_customer_id,sku=lines->0->>'sku',quantity=(lines->0->>'quantity')::integer,unit_price=price,discount_percent=max_discount,tax_rate=rate,subtotal=sum_net,tax_total=sum_tax,total=sum_net+sum_tax,source_lead_number=p_source_lead_number,status=case when max_discount>5 then 'Pending Approval' else 'Quotation' end,revision=revision+1,approved_by=null,approved_label=null,approved_at=null,approved_revision=null,updated_at=now()where number=ref;
 end if;
 delete from public.quotation_lines where quotation_number=ref;
 insert into public.quotation_lines select ref,x.sku,x.quantity,p.sales_price,x.discount_percent,round(p.sales_price*x.quantity*(1-x.discount_percent/100),0),round(round(p.sales_price*x.quantity*(1-x.discount_percent/100),0)*rate/100,0)from jsonb_to_recordset(lines)as x(sku text,quantity integer,discount_percent numeric)join public.products p on p.sku=x.sku;
 perform public._workflow_record(p_idempotency_key,'save_quotation_lines',payload,ref);perform public.write_business_audit(case when p_number is null then 'create' else 'update' end,'quotation',ref,jsonb_build_object('lines',lines,'total',sum_net+sum_tax));return ref;
end;$$;
create or replace function public.save_quotation(p_number text,p_customer_id text,p_sku text,p_quantity integer,p_discount_percent numeric,p_source_lead_number text,p_expected_revision integer,p_idempotency_key text) returns text
language sql security definer set search_path='' as $$select public.save_quotation_lines(p_number,p_customer_id,jsonb_build_array(jsonb_build_object('sku',p_sku,'quantity',p_quantity,'discount_percent',p_discount_percent)),p_source_lead_number,p_expected_revision,p_idempotency_key);$$;

create function public.save_rfq_lines(p_number text,p_vendor_id text,p_lines jsonb,p_expected_revision integer,p_idempotency_key text)returns text
language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_transaction_role(array['procurement','owner']::public.app_role[]);lines jsonb:=public._business_lines(p_lines,'rfq');ref text;q public.rfqs%rowtype;item record;price public.vendor_pricelist%rowtype;amount numeric:=0;payload jsonb;
begin
 payload:=jsonb_build_array(p_number,p_vendor_id,lines,p_expected_revision);ref:=public._workflow_replay(p_idempotency_key,'save_rfq_lines',payload);if ref is not null then return ref;end if;
 if p_number is not null then select * into q from public.rfqs where number=p_number for update;if not found or q.status in ('Confirmed','Cancelled')then raise exception 'RFQ terkunci atau tidak ditemukan';end if;if p_expected_revision is null or q.revision<>p_expected_revision then raise exception 'RFQ sudah berubah; muat ulang';end if;ref:=p_number;
 else ref:='RFQ'||lpad(nextval('public.rfq_number_seq')::text,5,'0');end if;
 for item in select * from jsonb_to_recordset(lines)as x(sku text,quantity integer)loop
  select * into price from public.vendor_pricelist where vendor_id=p_vendor_id and sku=item.sku for share;
  if not found or item.quantity<price.minimum_quantity or price.purchase_price<=0 then raise exception 'Vendor/Product/Quantity minimum tidak valid: %',item.sku;end if;amount:=amount+price.purchase_price*item.quantity;
 end loop;
 select * into price from public.vendor_pricelist where vendor_id=p_vendor_id and sku=lines->0->>'sku';
 if p_number is null then insert into public.rfqs(number,vendor_id,sku,quantity,unit_price,purchase_tax,total,status,created_by)values(ref,p_vendor_id,price.sku,(lines->0->>'quantity')::integer,price.purchase_price,price.purchase_tax,amount,'RFQ',actor);
 else update public.rfqs set vendor_id=p_vendor_id,sku=price.sku,quantity=(lines->0->>'quantity')::integer,unit_price=price.purchase_price,purchase_tax=price.purchase_tax,total=amount,status='RFQ',revision=revision+1,updated_at=now()where number=ref;end if;
 delete from public.rfq_lines where rfq_number=ref;
 insert into public.rfq_lines select ref,x.sku,x.quantity,p.purchase_price,p.purchase_tax,x.quantity*p.purchase_price from jsonb_to_recordset(lines)as x(sku text,quantity integer)join public.vendor_pricelist p on p.sku=x.sku and p.vendor_id=p_vendor_id;
 perform public._workflow_record(p_idempotency_key,'save_rfq_lines',payload,ref);perform public.write_business_audit(case when p_number is null then 'create' else 'update' end,'rfq',ref,jsonb_build_object('lines',lines,'total',amount));return ref;
end;$$;
create or replace function public.save_rfq(p_number text,p_vendor_id text,p_sku text,p_quantity integer,p_expected_revision integer,p_idempotency_key text)returns text language sql security definer set search_path='' as $$select public.save_rfq_lines(p_number,p_vendor_id,jsonb_build_array(jsonb_build_object('sku',p_sku,'quantity',p_quantity)),p_expected_revision,p_idempotency_key);$$;

create or replace function public.confirm_quotation(p_number text,p_idempotency_key text)returns text language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_transaction_role(array['sales','owner']::public.app_role[]);q public.quotations%rowtype;c public.customers%rowtype;item public.quotation_lines%rowtype;ref text;prior text;outstanding numeric;committed numeric;hand integer;reserved integer;
begin
 prior:=public._workflow_replay(p_idempotency_key,'confirm_quotation_lines',to_jsonb(p_number));if prior is not null then return prior;end if;
 select * into q from public.quotations where number=p_number for update;if not found or q.status='Cancelled'then raise exception 'Quotation tidak aktif';end if;
 if q.status='Confirmed'then ref:=q.sales_order_number;else
  if q.discount_percent>5 and(q.approved_by is null or q.approved_revision is distinct from q.revision)then raise exception 'Persetujuan Owner wajib untuk Discount di atas 5%%';end if;
  select * into c from public.customers where id=q.customer_id for update;
  perform public._expire_pos_holds_system(actor,'confirm_quotation');
  if not exists(select 1 from public.quotation_lines where quotation_number=p_number)then raise exception 'Order Lines kosong';end if;
  for item in select * from public.quotation_lines where quotation_number=p_number order by sku loop
   select on_hand into hand from public.stock_balances where sku=item.sku and location_code='WH-TBT' for update;if not found then raise exception 'Saldo Product % tidak ditemukan',item.sku;end if;
   select coalesce(sum(quantity),0) into reserved from public.inventory_reservations where sku=item.sku and location_code='WH-TBT' and status='active';if hand-reserved<item.quantity then raise exception 'Available WH-TBT tidak mencukupi untuk %',item.sku;end if;
  end loop;
  select coalesce(sum(total-amount_paid-amount_credited),0)into outstanding from public.customer_invoices where customer_id=q.customer_id and status='Posted';
  select coalesce(sum(so.total-coalesce(billed.amount,0)),0)into committed from public.sales_orders so left join lateral(select sum(ci.total)amount from public.customer_invoices ci where left(ci.source_document,length(so.number)+1)=so.number||':'and ci.status='Posted')billed on true where so.customer_id=q.customer_id and so.status in ('Sales Order','Partial Delivery','Delivered');
  if outstanding+committed+q.total>c.credit_limit then raise exception 'Limit kredit terlampaui: eksposur %, limit %',outstanding+committed+q.total,c.credit_limit;end if;
  if q.source_lead_number is not null then
   if not exists(select 1 from public.leads where number=q.source_lead_number and customer_id=q.customer_id and stage in ('Qualified','Proposition','Won'))then raise exception 'Peluang sumber tidak memenuhi syarat';end if;
   update public.leads set stage='Won'where number=q.source_lead_number;perform public.write_business_audit('convert','lead',q.source_lead_number,jsonb_build_object('quotation',p_number));
  end if;
  ref:='S'||lpad(nextval('public.sales_order_number_seq')::text,5,'0');
  insert into public.sales_orders(number,customer_id,source_lead_number,status,order_date,location_code,discount_percent,subtotal,tax_total,total,locked_at,idempotency_key,request_hash,quotation_number)values(ref,q.customer_id,q.source_lead_number,'Sales Order',(now()at time zone'Asia/Jakarta')::date,'WH-TBT',q.discount_percent,q.subtotal,q.tax_total,q.total,now(),p_idempotency_key,md5(q.number||':'||q.revision),q.number);
  insert into public.sales_order_lines(sales_order_number,sku,quantity,unit_price,discount_percent,tax_code,subtotal,tax_amount)select ref,sku,quantity,unit_price,discount_percent,'PBJT10',subtotal,tax_amount from public.quotation_lines where quotation_number=p_number;
  insert into public.inventory_reservations(sku,location_code,source_type,source_reference,quantity,status)select sku,'WH-TBT','sales_order',ref,quantity,'active'from public.quotation_lines where quotation_number=p_number;
  update public.quotations set status='Confirmed',sales_order_number=ref,updated_at=now()where number=p_number;perform public.write_business_audit('create','sales_order',ref,jsonb_build_object('quotation',p_number,'total',q.total));perform public.write_business_audit('confirm','quotation',p_number,jsonb_build_object('sales_order',ref));
 end if;
 perform public._workflow_record(p_idempotency_key,'confirm_quotation_lines',to_jsonb(p_number),ref);return ref;
end;$$;

create or replace function public.confirm_rfq(p_number text,p_idempotency_key text)returns text language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_transaction_role(array['procurement','owner']::public.app_role[]);q public.rfqs%rowtype;ref text;item public.rfq_lines%rowtype;
begin
 ref:=public._workflow_replay(p_idempotency_key,'confirm_rfq_lines',to_jsonb(p_number));if ref is not null then return ref;end if;
 select * into q from public.rfqs where number=p_number for update;if not found or q.status='Cancelled'then raise exception 'RFQ tidak aktif';end if;
 if q.status='Confirmed'then ref:=q.purchase_order_number;else
  if not exists(select 1 from public.rfq_lines where rfq_number=p_number)then raise exception 'Order Lines kosong';end if;
  for item in select * from public.rfq_lines where rfq_number=p_number loop
   if not exists(select 1 from public.vendor_pricelist where vendor_id=q.vendor_id and sku=item.sku and minimum_quantity<=item.quantity)then raise exception 'Quantity di bawah minimum pembelian atau Vendor Product tidak tersedia';end if;
  end loop;
  ref:='PO'||lpad(nextval('public.purchase_order_number_seq')::text,5,'0');insert into public.purchase_orders(number,vendor_id,status,order_date,destination_code,total,locked_at,idempotency_key,request_hash,rfq_number)values(ref,q.vendor_id,'Purchase Order',(now()at time zone'Asia/Jakarta')::date,'WH-TBT',q.total,now(),p_idempotency_key,md5(q.number||':'||q.revision),q.number);
  insert into public.purchase_order_lines(purchase_order_number,sku,quantity,unit_price,purchase_tax)select ref,sku,quantity,unit_price,purchase_tax from public.rfq_lines where rfq_number=p_number;
  update public.rfqs set status='Confirmed',purchase_order_number=ref,updated_at=now()where number=p_number;perform public.write_business_audit('create','purchase_order',ref,jsonb_build_object('rfq',p_number,'total',q.total));perform public.write_business_audit('confirm','rfq',p_number,jsonb_build_object('purchase_order',ref));
 end if;
 perform public._workflow_record(p_idempotency_key,'confirm_rfq_lines',to_jsonb(p_number),ref);return ref;
end;$$;
revoke all on function public.save_quotation_lines(text,text,jsonb,text,integer,text),public.save_rfq_lines(text,text,jsonb,integer,text),public.deliver_sales_order_lines(text,jsonb,text),public.receive_purchase_order_lines(text,jsonb,text) from public,anon;
grant execute on function public.save_quotation_lines(text,text,jsonb,text,integer,text),public.save_rfq_lines(text,text,jsonb,integer,text),public.deliver_sales_order_lines(text,jsonb,text),public.receive_purchase_order_lines(text,jsonb,text) to authenticated;
notify pgrst,'reload schema';
commit;
