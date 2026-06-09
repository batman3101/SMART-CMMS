/**
 * Factory-scoped Supabase access (#2 deepening).
 *
 * The whole app is multi-tenant by `factory_id`, yet scoping was hand-written
 * with `.eq('factory_id', getCurrentFactoryId())` at ~110 call sites — one
 * omission silently leaks across factories (there is no RLS yet). `scopedDb()`
 * makes the scope structural: every read/write through it is factory-scoped,
 * and access to genuinely global tables must be spelled out via `.global`.
 *
 * RLS (server-side enforcement) is tracked as a separate ADR track; until it
 * lands, this seam is the single client-side guard.
 */

import { supabase } from './supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useAuthStore } from '@/stores/authStore'

/** Current factory id (UUID/code) from auth state. Mirrors api.ts getCurrentFactoryId. */
export function currentFactoryId(): string {
  return useAuthStore.getState().currentFactory || 'ALT'
}

function client(): SupabaseClient {
  if (!supabase) {
    throw new Error('Supabase client is not initialized')
  }
  // Cast to the untyped base client: callers pass runtime table names, so we
  // intentionally use the schema-agnostic builder and let api.ts call sites keep
  // their existing row typing (exactly as they did with getSupabase()).
  return supabase as unknown as SupabaseClient
}

type SelectOptions = { head?: boolean; count?: 'exact' | 'planned' | 'estimated' }
type Row = Record<string, unknown>

/**
 * A factory-scoped query entrypoint. Reads/updates/deletes are auto-filtered by
 * `factory_id`; inserts/upserts get `factory_id` injected into each row.
 */
function scopedTable(table: string, factoryId: string) {
  const sb = client()
  const withFactory = (values: Row | Row[]): Row | Row[] =>
    Array.isArray(values)
      ? values.map((v) => ({ factory_id: factoryId, ...v }))
      : { factory_id: factoryId, ...values }

  return {
    select(columns = '*', options?: SelectOptions) {
      // A runtime table name + embedded relations defeat Supabase's generated-schema
      // inference (it yields GenericStringError). Cast so callers keep their own row
      // typing, exactly as they did when calling getSupabase().from(...).select(...).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (sb.from(table).select(columns, options) as any).eq('factory_id', factoryId)
    },
    insert(values: Row | Row[]) {
      return sb.from(table).insert(withFactory(values))
    },
    upsert(values: Row | Row[], options?: { onConflict?: string }) {
      return sb.from(table).upsert(withFactory(values), options)
    },
    update(values: Row) {
      return sb.from(table).update(values).eq('factory_id', factoryId)
    },
    delete() {
      return sb.from(table).delete().eq('factory_id', factoryId)
    },
  }
}

export function scopedDb(factoryId: string = currentFactoryId()) {
  return {
    /** Factory-scoped table access. */
    from(table: string) {
      return scopedTable(table, factoryId)
    },
    /**
     * Explicit, greppable opt-out for genuinely global tables
     * (equipment_types, repair_types, factories, …). Not factory-scoped.
     */
    get global() {
      return client()
    },
    /** The resolved factory id used for scoping (for callers that still need it). */
    factoryId,
  }
}

export type ScopedDb = ReturnType<typeof scopedDb>
