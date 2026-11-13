-- Owner-only profile management; Auth provisioning stays server-side.
begin;
create function public.list_app_users()returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform public.require_transaction_role(array['owner']::public.app_role[]);
 return coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name,'role',p.role,'email',u.email,'created_at',p.created_at)order by p.role,p.full_name)from public.profiles p join auth.users u on u.id=p.id),'[]'::jsonb);
end;$$;
create function public.manage_user_profile(p_user_id uuid,p_full_name text,p_role public.app_role,p_expected_role public.app_role,p_expected_name text,p_idempotency_key text)returns text
language plpgsql security definer set search_path='' as $$
declare actor uuid:=public.require_transaction_role(array['owner']::public.app_role[]);old public.profiles%rowtype;ref text;payload jsonb:=jsonb_build_array(p_user_id,p_full_name,p_role,p_expected_role,p_expected_name);
begin
 ref:=public._workflow_replay(p_idempotency_key,'manage_user_profile',payload);if ref is not null then return ref;end if;
 if p_role is null or p_full_name is null or length(btrim(p_full_name))not between 1 and 150 then raise exception 'Name dan Role wajib valid';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('profile-role-management'));
 perform public.require_transaction_role(array['owner']::public.app_role[]);
 if not exists(select 1 from auth.users where id=p_user_id)then raise exception 'Akun belum terdaftar';end if;
 select * into old from public.profiles where id=p_user_id for update;
 if found then
  if p_expected_role is distinct from old.role or p_expected_name is distinct from old.full_name then raise exception 'Data User sudah berubah; muat ulang sebelum menyimpan';end if;
  if p_user_id=actor and p_role<>'owner'then raise exception 'Owner tidak dapat menurunkan role akunnya sendiri';end if;
  if old.role='owner'and p_role<>'owner'and(select count(*)from public.profiles where role='owner')<=1 then raise exception 'Minimal satu Owner harus dipertahankan';end if;
  update public.profiles set full_name=btrim(p_full_name),role=p_role where id=p_user_id;
 else
  if p_expected_role is not null or p_expected_name is not null then raise exception 'User tidak ditemukan';end if;
  insert into public.profiles(id,full_name,role)values(p_user_id,btrim(p_full_name),p_role);
 end if;
 ref:=p_user_id::text;perform public._workflow_record(p_idempotency_key,'manage_user_profile',payload,ref);
 perform public.write_business_audit('manage_access','profile',ref,jsonb_build_object('old_role',old.role,'role',p_role,'full_name',btrim(p_full_name)));return ref;
end;$$;
revoke all on function public.list_app_users(),public.manage_user_profile(uuid,text,public.app_role,public.app_role,text,text)from public,anon;
grant execute on function public.list_app_users(),public.manage_user_profile(uuid,text,public.app_role,public.app_role,text,text)to authenticated;
notify pgrst,'reload schema';
commit;
