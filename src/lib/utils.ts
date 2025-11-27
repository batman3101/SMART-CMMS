import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, locale: string = 'ko-KR'): string {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatDateTime(date: string | Date, locale: string = 'ko-KR'): string {
  return new Date(date).toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) {
    return `${mins}분`
  }
  if (mins === 0) {
    return `${hours}시간`
  }
  return `${hours}시간 ${mins}분`
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    normal: 'bg-status-normal',
    pm: 'bg-status-pm',
    repair: 'bg-status-repair',
    emergency: 'bg-status-emergency',
    standby: 'bg-status-standby',
  }
  return colors[status] || 'bg-gray-400'
}

export function getStatusTextColor(status: string): string {
  const colors: Record<string, string> = {
    normal: 'text-status-normal',
    pm: 'text-status-pm',
    repair: 'text-status-repair',
    emergency: 'text-status-emergency',
    standby: 'text-status-standby',
  }
  return colors[status] || 'text-gray-400'
}

export function generateRecordNo(prefix: string = 'MR'): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${year}${month}${day}-${random}`
}
