import { useState, useMemo, useCallback } from 'react'

export type SortDirection = 'asc' | 'desc' | null

export interface SortConfig<T> {
  key: keyof T | string | null
  direction: SortDirection
}

export interface UseTableSortReturn<T> {
  sortConfig: SortConfig<T>
  sortedData: T[]
  requestSort: (key: keyof T | string) => void
  getSortDirection: (key: keyof T | string) => SortDirection
  resetSort: () => void
}

type GetValueFn<T> = (item: T, key: string) => unknown

const defaultGetValue: GetValueFn<unknown> = (item, key) => {
  const keys = key.split('.')
  let value: unknown = item
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k]
    } else {
      return undefined
    }
  }
  return value
}

export function useTableSort<T>(
  data: T[],
  initialConfig: SortConfig<T> = { key: null, direction: null },
  getValue: GetValueFn<T> = defaultGetValue as GetValueFn<T>
): UseTableSortReturn<T> {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>(initialConfig)

  const requestSort = useCallback((key: keyof T | string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.direction === 'asc') {
          return { key, direction: 'desc' }
        } else if (prev.direction === 'desc') {
          return { key: null, direction: null }
        }
      }
      return { key, direction: 'asc' }
    })
  }, [])

  const getSortDirection = useCallback(
    (key: keyof T | string): SortDirection => {
      if (sortConfig.key === key) {
        return sortConfig.direction
      }
      return null
    },
    [sortConfig]
  )

  const resetSort = useCallback(() => {
    setSortConfig({ key: null, direction: null })
  }, [])

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return data
    }

    return [...data].sort((a, b) => {
      const aValue = getValue(a, sortConfig.key as string)
      const bValue = getValue(b, sortConfig.key as string)

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1
      if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1

      // Compare values
      let comparison = 0
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue, 'ko')
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime()
      } else {
        comparison = String(aValue).localeCompare(String(bValue), 'ko')
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
  }, [data, sortConfig, getValue])

  return {
    sortConfig,
    sortedData,
    requestSort,
    getSortDirection,
    resetSort,
  }
}
