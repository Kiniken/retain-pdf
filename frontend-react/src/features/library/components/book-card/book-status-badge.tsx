import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

type BookStatusBadgeProps = {
  label: string
  icon: LucideIcon
  spinning?: boolean
}

export function BookStatusBadge({ label, icon: StatusIcon, spinning = false }: BookStatusBadgeProps) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
      <StatusIcon className={cn('size-3.5', spinning && 'animate-spin')} />
      {label}
    </div>
  )
}
