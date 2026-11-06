-- Correct legacy thousand-separator truncation on CP00004 for INV00003 (330 -> 330000).
-- Idempotent and strictly scoped to CP00004 / INV00003 without creating duplicate payments.
do $migration$
declare
  v_journal_id uuid;
begin
  if exists (
    select 1
    from public.customer_payments cp
    join public.customer_invoices ci on ci.number = cp.invoice_number
    where cp.number = 'CP00004'
      and cp.invoice_number = 'INV00003'
      and cp.amount = 330
      and ci.total = 330000
      and ci.amount_paid = 330
  ) then
    update public.customer_payments
    set amount = 330000
    where number = 'CP00004'
      and invoice_number = 'INV00003'
      and amount = 330;

    update public.customer_invoices
    set amount_paid = 330000
    where number = 'INV00003'
      and total = 330000
      and amount_paid = 330;

    select je.id into v_journal_id
    from public.journal_entries je
    where je.source_type = 'customer_payment'
      and je.source_reference = 'CP00004';

    if v_journal_id is not null then
      update public.journal_lines
      set debit = 330000
      where journal_entry_id = v_journal_id
        and account_code = '1102'
        and debit = 330
        and credit = 0;

      update public.journal_lines
      set credit = 330000
      where journal_entry_id = v_journal_id
        and account_code = '1201'
        and debit = 0
        and credit = 330;
    end if;
  end if;
end;
$migration$;

