-- Limit new POS holds to the maximum duration required by the scenario.
-- Existing rows remain valid; duration changes and new rows are guarded.
create function public.enforce_pos_hold_duration_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.expires_in_minutes is null or new.expires_in_minutes not between 1 and 10 then
      raise exception 'Masa hold POS harus antara 1 dan 10 menit';
    end if;
  elsif new.expires_in_minutes is distinct from old.expires_in_minutes
     and (new.expires_in_minutes is null or new.expires_in_minutes not between 1 and 10) then
    raise exception 'Masa hold POS harus antara 1 dan 10 menit';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_pos_hold_duration_limit() from public, anon, authenticated;

create trigger pos_hold_duration_limit
before insert or update on public.pos_holds
for each row execute function public.enforce_pos_hold_duration_limit();
