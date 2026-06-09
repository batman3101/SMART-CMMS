-- Add covering indexes for unindexed foreign keys (advisor: unindexed_foreign_keys).
-- Additive and safe; improves join/lookup and cascade performance.
create index if not exists idx_paint_step_executions_step_id
  on public.paint_step_executions (step_id);

create index if not exists idx_paint_step_executions_technician_id
  on public.paint_step_executions (technician_id);

create index if not exists idx_pm_executions_created_repair_id
  on public.pm_executions (created_repair_id);

create index if not exists idx_settings_updated_by
  on public.settings (updated_by);
