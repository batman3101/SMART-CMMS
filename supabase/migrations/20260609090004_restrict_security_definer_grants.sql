-- Effective revoke of anon/public RPC access to the SECURITY DEFINER helpers.
-- Supersedes the REVOKE ... FROM anon in 20260609090001 (which was ineffective
-- because EXECUTE is granted to PUBLIC by default, so anon inherited it via PUBLIC).
-- Revoke from PUBLIC, then re-grant to authenticated where RLS evaluation needs it.
revoke execute on function public.get_user_factory_id(uuid) from public;
grant  execute on function public.get_user_factory_id(uuid) to authenticated;

revoke execute on function public.get_user_role(uuid) from public;
grant  execute on function public.get_user_role(uuid) to authenticated;

-- Trigger function: never invoked directly via RPC by any client role.
revoke execute on function public.notify_long_repair() from public;

-- NOTE: advisor 0029 (authenticated can execute get_user_factory_id/get_user_role)
-- remains by design — RLS policies evaluate these helpers in the authenticated
-- caller's context, so authenticated MUST retain EXECUTE.
