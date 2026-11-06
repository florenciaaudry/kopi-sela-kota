-- Tighten financial Credit Note posting without changing transaction data.
-- Safe to rerun: fails closed if the expected guard cannot be identified.
do $migration$
declare
  definition text;
  old_guard text := $guard$public.require_transaction_role(array['sales', 'finance', 'owner']::public.app_role[])$guard$;
  new_guard text := $guard$public.require_transaction_role(array['finance', 'owner']::public.app_role[])$guard$;
begin
  select pg_get_functiondef('public.create_customer_credit_note(text,text,integer,text,text)'::regprocedure) into definition;
  if strpos(definition, old_guard) > 0 then
    execute replace(definition, old_guard, new_guard);
  elsif strpos(definition, new_guard) = 0 then
    raise exception 'Unrecognized Credit Note role guard; no change applied';
  end if;
end;
$migration$;
