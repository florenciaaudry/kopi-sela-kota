begin;
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
commit;
