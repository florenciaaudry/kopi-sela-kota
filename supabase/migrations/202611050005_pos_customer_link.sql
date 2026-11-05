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
