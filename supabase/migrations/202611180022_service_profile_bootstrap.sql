-- Supabase projects created with automatic Data API grants disabled still need
-- the existing server-only administrator role to bootstrap scenario profiles.
-- No grant is added for anon/authenticated and no RLS policy is changed.
do $bootstrap$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update on table public.profiles to service_role;
  end if;
end
$bootstrap$;
