-- Optimize RLS initplan: wrap auth.*/helper calls in (select ...) so they
-- are evaluated once per query (InitPlan) instead of once per row.
-- Behaviour is identical; this only addresses the auth_rls_initplan advisor
-- across 24 tables / 88 policies. Generated, review before apply.

-- activity_logs
alter policy "activity_logs_select" on public.activity_logs
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "activity_logs_insert" on public.activity_logs
  with check (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
-- ai_chat_history
alter policy "ai_chat_history_delete" on public.ai_chat_history
  using ((((EXISTS ( SELECT 1 FROM users u WHERE ((u.auth_user_id = (select auth.uid())) AND (u.id = ai_chat_history.user_id)))) OR ((select get_user_role(auth.uid())) = 1)) AND ((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1))));
alter policy "ai_chat_history_insert" on public.ai_chat_history
  with check (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "ai_chat_history_select" on public.ai_chat_history
  using ((((EXISTS ( SELECT 1 FROM users u WHERE ((u.auth_user_id = (select auth.uid())) AND (u.id = ai_chat_history.user_id)))) OR ((select get_user_role(auth.uid())) = 1)) AND ((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1))));
alter policy "ai_chat_history_update" on public.ai_chat_history
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
-- ai_insights
alter policy "ai_insights_select" on public.ai_insights
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
-- equipment_types
alter policy "Admins can manage equipment_types" on public.equipment_types
  using ((EXISTS ( SELECT 1 FROM users u WHERE ((u.auth_user_id = (select auth.uid())) AND (u.role <= 2)))));
alter policy "Authenticated can delete equipment_types" on public.equipment_types
  using (((select auth.role()) = 'authenticated'::text));
alter policy "Authenticated can insert equipment_types" on public.equipment_types
  with check (((select auth.role()) = 'authenticated'::text));
alter policy "Authenticated can read equipment_types" on public.equipment_types
  using (((select auth.role()) = 'authenticated'::text));
alter policy "Authenticated can update equipment_types" on public.equipment_types
  using (((select auth.role()) = 'authenticated'::text))
  with check (((select auth.role()) = 'authenticated'::text));
alter policy "Authenticated users can view equipment_types" on public.equipment_types
  using (((select auth.role()) = 'authenticated'::text));
-- equipments
alter policy "equipments_select" on public.equipments
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "equipments_insert" on public.equipments
  with check (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "equipments_update" on public.equipments
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "equipments_delete" on public.equipments
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
-- generated_reports
alter policy "generated_reports_select" on public.generated_reports
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "generated_reports_insert" on public.generated_reports
  with check (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "generated_reports_update" on public.generated_reports
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "generated_reports_delete" on public.generated_reports
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
-- maintenance_images
alter policy "maintenance_images_select" on public.maintenance_images
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "maintenance_images_insert" on public.maintenance_images
  with check (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "maintenance_images_update" on public.maintenance_images
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "maintenance_images_delete" on public.maintenance_images
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
-- maintenance_parts
alter policy "maintenance_parts_select" on public.maintenance_parts
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "maintenance_parts_insert" on public.maintenance_parts
  with check (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "maintenance_parts_update" on public.maintenance_parts
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "maintenance_parts_delete" on public.maintenance_parts
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
-- maintenance_records
alter policy "maintenance_records_select" on public.maintenance_records
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "maintenance_records_insert" on public.maintenance_records
  with check (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "maintenance_records_update" on public.maintenance_records
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "maintenance_records_delete" on public.maintenance_records
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
-- paint_executions
alter policy "paint_executions_select" on public.paint_executions
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "paint_executions_insert" on public.paint_executions
  with check (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "paint_executions_update" on public.paint_executions
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "paint_executions_delete" on public.paint_executions
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
-- paint_schedules
alter policy "paint_schedules_select" on public.paint_schedules
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "paint_schedules_insert" on public.paint_schedules
  with check (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "paint_schedules_update" on public.paint_schedules
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "paint_schedules_delete" on public.paint_schedules
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
-- paint_step_executions
alter policy "paint_step_executions_select" on public.paint_step_executions
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "paint_step_executions_insert" on public.paint_step_executions
  with check (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "paint_step_executions_update" on public.paint_step_executions
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "paint_step_executions_delete" on public.paint_step_executions
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
-- paint_templates
alter policy "paint_templates_select" on public.paint_templates
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "paint_templates_insert" on public.paint_templates
  with check (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "paint_templates_update" on public.paint_templates
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "paint_templates_delete" on public.paint_templates
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
-- pm_executions
alter policy "pm_executions_select" on public.pm_executions
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "pm_executions_insert" on public.pm_executions
  with check (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "pm_executions_update" on public.pm_executions
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "pm_executions_delete" on public.pm_executions
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
-- pm_schedules
alter policy "pm_schedules_select" on public.pm_schedules
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "pm_schedules_insert" on public.pm_schedules
  with check (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "pm_schedules_update" on public.pm_schedules
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "pm_schedules_delete" on public.pm_schedules
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
-- pm_templates
alter policy "pm_templates_select" on public.pm_templates
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "pm_templates_insert" on public.pm_templates
  with check (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "pm_templates_update" on public.pm_templates
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "pm_templates_delete" on public.pm_templates
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
-- notification_logs
alter policy "notification_logs_insert" on public.notification_logs
  with check (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "notification_logs_select" on public.notification_logs
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
-- notifications
alter policy "notifications_delete" on public.notifications
  using (((EXISTS ( SELECT 1 FROM users u WHERE ((u.auth_user_id = (select auth.uid())) AND (u.id = notifications.user_id)))) AND ((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1))));
alter policy "notifications_insert" on public.notifications
  with check (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "notifications_select" on public.notifications
  using ((((user_id IS NULL) OR (EXISTS ( SELECT 1 FROM users u WHERE ((u.auth_user_id = (select auth.uid())) AND (u.id = notifications.user_id))))) AND ((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1))));
alter policy "notifications_update" on public.notifications
  using (((EXISTS ( SELECT 1 FROM users u WHERE ((u.auth_user_id = (select auth.uid())) AND (u.id = notifications.user_id)))) AND ((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1))));
-- repair_types
alter policy "Authenticated can delete repair_types" on public.repair_types
  using (((select auth.role()) = 'authenticated'::text));
alter policy "Authenticated can insert repair_types" on public.repair_types
  with check (((select auth.role()) = 'authenticated'::text));
alter policy "Authenticated can read repair_types" on public.repair_types
  using (((select auth.role()) = 'authenticated'::text));
alter policy "Authenticated can update repair_types" on public.repair_types
  using (((select auth.role()) = 'authenticated'::text))
  with check (((select auth.role()) = 'authenticated'::text));
-- role_permissions
alter policy "Admins can manage role_permissions" on public.role_permissions
  using ((EXISTS ( SELECT 1 FROM users u WHERE ((u.auth_user_id = (select auth.uid())) AND (u.role = 1)))));
alter policy "Authenticated users can view role_permissions" on public.role_permissions
  using (((select auth.role()) = 'authenticated'::text));
-- settings
alter policy "settings_insert" on public.settings
  with check (((select get_user_role(auth.uid())) = 1));
alter policy "settings_select" on public.settings
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "settings_update" on public.settings
  using (((factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
-- user_fcm_tokens
alter policy "Users can delete their own FCM tokens" on public.user_fcm_tokens
  using ((EXISTS ( SELECT 1 FROM users WHERE ((users.id = user_fcm_tokens.user_id) AND (users.auth_user_id = (select auth.uid()))))));
alter policy "Users can insert their own FCM tokens" on public.user_fcm_tokens
  with check ((EXISTS ( SELECT 1 FROM users WHERE ((users.id = user_fcm_tokens.user_id) AND (users.auth_user_id = (select auth.uid()))))));
alter policy "Users can update their own FCM tokens" on public.user_fcm_tokens
  using ((EXISTS ( SELECT 1 FROM users WHERE ((users.id = user_fcm_tokens.user_id) AND (users.auth_user_id = (select auth.uid()))))));
alter policy "Users can view their own FCM tokens" on public.user_fcm_tokens
  using ((EXISTS ( SELECT 1 FROM users WHERE ((users.id = user_fcm_tokens.user_id) AND (users.auth_user_id = (select auth.uid()))))));
-- user_push_settings
alter policy "Service role can manage push settings" on public.user_push_settings
  using (((select auth.role()) = 'service_role'::text));
alter policy "Users can insert own push settings" on public.user_push_settings
  with check (((select auth.uid()) = user_id));
alter policy "Users can update own push settings" on public.user_push_settings
  using (((select auth.uid()) = user_id));
alter policy "Users can view own push settings" on public.user_push_settings
  using (((select auth.uid()) = user_id));
-- users
alter policy "users_delete" on public.users
  using (((select get_user_role(auth.uid())) = 1));
alter policy "users_insert" on public.users
  with check (((select get_user_role(auth.uid())) = 1));
alter policy "users_select" on public.users
  using (((auth_user_id = (select auth.uid())) OR (factory_id = (select get_user_factory_id(auth.uid()))) OR ((select get_user_role(auth.uid())) = 1)));
alter policy "users_update" on public.users
  using (((auth_user_id = (select auth.uid())) OR ((select get_user_role(auth.uid())) = 1)));
