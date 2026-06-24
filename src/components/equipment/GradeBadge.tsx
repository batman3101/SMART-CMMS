import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { gradeBadgeClass } from '@/lib/grade'
import type { GradeLetter } from '@/types'

interface GradeBadgeProps {
  grade: GradeLetter | null | undefined
  /** Show "미평가/Chưa đánh giá" text when ungraded instead of a dash. */
  showUnratedText?: boolean
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Colored equipment-grade chip (A+ best → D worst). Renders a neutral "not
 * evaluated" chip when the grade is null so the list still reads cleanly.
 */
export function GradeBadge({ grade, showUnratedText = false, size = 'md', className }: GradeBadgeProps) {
  const { t } = useTranslation()

  const label = grade ?? (showUnratedText ? t('grade.notEvaluated') : '–')

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md border font-bold leading-none',
        size === 'sm' ? 'min-w-[2rem] px-1.5 py-0.5 text-xs' : 'min-w-[2.5rem] px-2 py-1 text-sm',
        gradeBadgeClass(grade),
        className
      )}
      title={grade ? `${t('grade.label')}: ${grade}` : t('grade.notEvaluated')}
    >
      {label}
    </span>
  )
}

export default GradeBadge
