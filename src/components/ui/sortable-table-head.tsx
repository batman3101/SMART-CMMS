import * as React from 'react'
import { cn } from '@/lib/utils'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import type { SortDirection } from '@/hooks/useTableSort'

interface SortableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortKey: string
  sortDirection: SortDirection
  onSort: (key: string) => void
  children: React.ReactNode
}

const SortableTableHead = React.forwardRef<HTMLTableCellElement, SortableTableHeadProps>(
  ({ className, sortKey, sortDirection, onSort, children, ...props }, ref) => {
    const handleClick = () => {
      onSort(sortKey)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSort(sortKey)
      }
    }

    return (
      <th
        ref={ref}
        className={cn(
          'h-10 px-2 text-left align-middle font-medium text-muted-foreground cursor-pointer select-none hover:bg-muted/50 transition-colors',
          className
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="columnheader"
        aria-sort={
          sortDirection === 'asc'
            ? 'ascending'
            : sortDirection === 'desc'
              ? 'descending'
              : 'none'
        }
        {...props}
      >
        <div className="flex items-center gap-1">
          <span>{children}</span>
          <span className="ml-1 flex-shrink-0">
            {sortDirection === 'asc' ? (
              <ArrowUp className="h-4 w-4 text-primary" />
            ) : sortDirection === 'desc' ? (
              <ArrowDown className="h-4 w-4 text-primary" />
            ) : (
              <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />
            )}
          </span>
        </div>
      </th>
    )
  }
)
SortableTableHead.displayName = 'SortableTableHead'

export { SortableTableHead }
