import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SortableTableHead } from '@/components/ui/sortable-table-head'
import {
  Search,
  Loader2,
  Package,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import { fetchPartsWithInventory, fetchPartCategories, isPartsSupabaseConnected } from '@/lib/supabase'
import { useTableSort } from '@/hooks'

// 실제 DB 스키마에 맞게 유연하게 처리
interface Part {
  part_id: string
  part_code: string
  part_name: string
  vietnamese_name?: string
  korean_name?: string
  category?: string
  unit?: string
  spec?: string
  min_stock?: number
  current_stock?: number
  inventory?: unknown
  [key: string]: unknown // 기타 필드 허용
}

const ITEMS_PER_PAGE = 20


export default function PartsPage() {
  const { t } = useTranslation()

  const [parts, setParts] = useState<Part[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [categories, setCategories] = useState<string[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const isConnected = isPartsSupabaseConnected()

  useEffect(() => {
    if (isConnected) {
      loadCategories()
    }
  }, [isConnected])

  useEffect(() => {
    if (isConnected) {
      loadParts()
    }
  }, [isConnected, searchQuery, categoryFilter, currentPage])

  const loadCategories = async () => {
    const { data } = await fetchPartCategories()
    if (data) {
      setCategories(data)
    }
  }

  const loadParts = async () => {
    setIsLoading(true)
    setError(null)

    const offset = (currentPage - 1) * ITEMS_PER_PAGE

    const { data, error: fetchError, count } = await fetchPartsWithInventory({
      search: searchQuery || undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      limit: ITEMS_PER_PAGE,
      offset,
    })

    if (fetchError) {
      setError(typeof fetchError === 'string' ? fetchError : t('common.error'))
      setParts([])
    } else if (data) {
      setParts(data as Part[])
      setTotalCount(count || 0)
    }

    setIsLoading(false)
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value)
    setCurrentPage(1)
  }

  const handleRefresh = () => {
    loadParts()
    loadCategories()
  }

  // Sorting
  const { sortedData, requestSort, getSortDirection } = useTableSort<Part>(
    parts,
    { key: 'part_name', direction: 'asc' }
  )

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  if (!isConnected) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">{t('parts.notConnected')}</p>
        <p className="text-sm text-muted-foreground">{t('parts.notConnectedDesc')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('parts.title')}</h1>
        <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('parts.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-[200px]"
            >
              <option value="all">{t('parts.allCategories')}</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('parts.list')}
            <Badge variant="secondary" className="ml-2">
              {t('parts.totalCount', { count: totalCount })}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      sortKey="part_code"
                      sortDirection={getSortDirection('part_code')}
                      onSort={requestSort}
                    >
                      {t('parts.partCode')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="part_name"
                      sortDirection={getSortDirection('part_name')}
                      onSort={requestSort}
                    >
                      {t('parts.partName')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="category"
                      sortDirection={getSortDirection('category')}
                      onSort={requestSort}
                    >
                      {t('parts.category')}
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="current_stock"
                      sortDirection={getSortDirection('current_stock')}
                      onSort={requestSort}
                      className="text-right"
                    >
                      {t('parts.currentStock')}
                    </SortableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((part) => (
                    <TableRow key={part.part_id}>
                      <TableCell className="font-mono">{part.part_code}</TableCell>
                      <TableCell className="font-medium">{part.part_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{part.category || '-'}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {part.current_stock ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {parts.length === 0 && !isLoading && (
                <div className="py-8 text-center text-muted-foreground">
                  {searchQuery || categoryFilter !== 'all'
                    ? t('common.noSearchResults')
                    : t('common.noData')}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t('parts.pageInfo', {
                      current: currentPage,
                      total: totalPages,
                      count: totalCount,
                    })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t('common.previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      {t('common.next')}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">{t('parts.totalParts')}</p>
            <p className="text-2xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">{t('parts.categories')}</p>
            <p className="text-2xl font-bold text-blue-600">{categories.length}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
