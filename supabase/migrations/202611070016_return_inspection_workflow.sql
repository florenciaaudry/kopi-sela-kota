-- Warehouse inspection/return movement followed by Finance Credit Note.
begin;
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
commit;
