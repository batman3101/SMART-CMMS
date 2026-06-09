/**
 * Typed data-layer errors (#2 deepening).
 *
 * The data layer keeps the `{ data, error }` envelope for caller compatibility,
 * but errors are normalized into a typed `DataError` so callers (and future code)
 * can distinguish a permission failure from a missing row or a network blip
 * instead of pattern-matching on a raw string.
 */

export type DataErrorKind =
  | 'not_found'
  | 'permission'
  | 'conflict'
  | 'validation'
  | 'network'
  | 'unknown'

export interface DataError {
  kind: DataErrorKind
  message: string
  /** Original Postgrest/Postgres error code, when available. */
  code?: string
}

interface RawError {
  message?: string
  code?: string
  details?: string
  hint?: string
}

/**
 * Classify a Supabase/Postgrest error into a typed DataError.
 * Returns null when there is no error.
 */
export function toDataError(error: RawError | null | undefined): DataError | null {
  if (!error) return null

  const code = error.code
  const message = error.message || 'Unknown error'

  let kind: DataErrorKind = 'unknown'
  switch (code) {
    case 'PGRST116': // No rows returned for .single()
      kind = 'not_found'
      break
    case '42501': // insufficient_privilege
    case 'PGRST301': // JWT / RLS denial
      kind = 'permission'
      break
    case '23505': // unique_violation
      kind = 'conflict'
      break
    case '23502': // not_null_violation
    case '23514': // check_violation
    case '22P02': // invalid_text_representation
      kind = 'validation'
      break
    default:
      if (!code && /network|fetch|failed to fetch|timeout/i.test(message)) {
        kind = 'network'
      }
  }

  return { kind, message, code }
}

/** Convenience: normalized message string for the legacy `{ error: string }` envelope. */
export function toErrorMessage(error: RawError | null | undefined): string | null {
  return toDataError(error)?.message ?? null
}
