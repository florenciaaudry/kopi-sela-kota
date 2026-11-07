-- Replay must resolve the local reference, not a joined column with the same name.
begin;
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
