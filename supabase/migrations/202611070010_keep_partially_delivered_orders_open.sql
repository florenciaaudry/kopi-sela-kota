-- Keep remaining goods deliverable after invoicing a partial delivery.
begin;
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

commit;
