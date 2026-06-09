-- Security hardening for advisor findings (0011 / 0028 / 0029).
-- Review before applying. No behavioural change for the app; tightens function
-- search_path and removes unnecessary anon RPC surface.

-- 1) Pin an immutable search_path on functions flagged as role-mutable (0011).
--    Keep `public` in scope so unqualified object refs inside the bodies still resolve.
alter function public.calculate_duration_minutes()            set search_path = public, pg_temp;
alter function public.calculate_pm_duration_minutes()         set search_path = public, pg_temp;
alter function public.generate_maintenance_record_no()        set search_path = public, pg_temp;
alter function public.get_user_factory_id(uuid)               set search_path = public, pg_temp;
alter function public.get_user_role(uuid)                     set search_path = public, pg_temp;
alter function public.notify_maintenance_started()            set search_path = public, pg_temp;
alter function public.notify_maintenance_completed()          set search_path = public, pg_temp;
alter function public.update_updated_at_column()              set search_path = public, pg_temp;
alter function public.update_user_fcm_tokens_updated_at()     set search_path = public, pg_temp;
alter function public.update_user_push_settings_updated_at()  set search_path = public, pg_temp;

-- 2) Revoke anon RPC access to the SECURITY DEFINER RLS helpers (0028).
--    These run *inside* RLS policies as the querying `authenticated` role, so
--    `authenticated` MUST keep EXECUTE. `anon` never triggers those policies and
--    has no reason to call them directly via /rest/v1/rpc.
revoke execute on function public.get_user_factory_id(uuid) from anon;
revoke execute on function public.get_user_role(uuid)       from anon;

-- 3) notify_long_repair() is a SECURITY DEFINER trigger function — it must never be
--    invokable directly via RPC by any client role (triggers run as the table owner).
revoke execute on function public.notify_long_repair() from anon, authenticated;
