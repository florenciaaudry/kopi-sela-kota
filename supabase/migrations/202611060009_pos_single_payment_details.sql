-- Direct single-SKU Cash/Bank sales predate the normalized receipt tables.
-- Populate their details atomically; hold checkout already writes its own lines.
create or replace function public.fill_direct_pos_receipt_details()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.hold_number is null and new.payment_method in ('CASH', 'BANK') then
    insert into public.pos_receipt_lines(receipt_number,sku,quantity,unit_price,subtotal,tax_amount)
    values(new.number,new.sku,new.quantity,new.subtotal/new.quantity,new.subtotal,new.tax_amount);
    insert into public.pos_receipt_tenders(receipt_number,payment_method,amount)
    values(new.number,new.payment_method,new.total);
  end if;
  return new;
end;
$$;
revoke all on function public.fill_direct_pos_receipt_details() from public,anon,authenticated;
drop trigger if exists direct_pos_receipt_details on public.pos_receipts;
create trigger direct_pos_receipt_details after insert on public.pos_receipts
for each row execute function public.fill_direct_pos_receipt_details();

-- Backfill only where the posted journal independently confirms the receipt.
-- No amounts, stock, session balances, expiry times or posted journals change.
do $repair$
declare r record; inserted_count integer; changed boolean;
begin
  for r in select pr.* from public.pos_receipts pr
    where pr.hold_number is null and pr.payment_method in ('CASH','BANK')
      and (not exists(select 1 from public.pos_receipt_lines l where l.receipt_number=pr.number)
        or not exists(select 1 from public.pos_receipt_tenders t where t.receipt_number=pr.number))
    for update
  loop
    if r.subtotal+r.tax_amount<>r.total or r.quantity<=0 then
      raise exception 'Legacy receipt % has inconsistent totals',r.number;
    end if;
    if (select count(*) from public.journal_entries je where je.source_type='pos_sale'
      and je.source_reference=r.number and je.status='posted')<>1 then
      raise exception 'Legacy receipt % requires one posted journal',r.number;
    end if;
    if not exists(
      select 1 from public.journal_entries je join public.journal_lines jl on jl.journal_entry_id=je.id
      where je.source_type='pos_sale' and je.source_reference=r.number and je.status='posted'
      group by je.id having sum(jl.debit)=sum(jl.credit)
        and coalesce(sum(jl.debit-jl.credit) filter(where jl.account_code=case when r.payment_method='CASH' then '1101' else '1102' end),0)=r.total
        and coalesce(sum(jl.debit-jl.credit) filter(where jl.account_code=case when r.payment_method='CASH' then '1102' else '1101' end),0)=0
        and coalesce(sum(jl.credit-jl.debit) filter(where jl.account_code='4101'),0)=r.subtotal
        and coalesce(sum(jl.credit-jl.debit) filter(where jl.account_code='2102'),0)=r.tax_amount
    ) then raise exception 'Legacy receipt % does not match posted ledger',r.number; end if;
    changed:=false;
    insert into public.pos_receipt_lines(receipt_number,sku,quantity,unit_price,subtotal,tax_amount)
    select r.number,r.sku,r.quantity,r.subtotal/r.quantity,r.subtotal,r.tax_amount
    where not exists(select 1 from public.pos_receipt_lines l where l.receipt_number=r.number);
    get diagnostics inserted_count=row_count;
    changed:=inserted_count>0;
    insert into public.pos_receipt_tenders(receipt_number,payment_method,amount)
    select r.number,r.payment_method,r.total
    where not exists(select 1 from public.pos_receipt_tenders t where t.receipt_number=r.number);
    get diagnostics inserted_count=row_count;
    if changed or inserted_count>0 then
      insert into public.audit_events(actor_id,actor_label,action,document_type,document_number,details)
      values(auth.uid(),'Perbaikan data legacy POS (migrasi 009)','repair_receipt_details','pos_receipt',r.number,
        jsonb_build_object('migration','009','basis','Receipt snapshot verified against posted ledger',
          'financial_amounts_changed',false,'stock_changed',false,'hold_status_changed',false));
    end if;
  end loop;
end;
$repair$;
