import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type BookCardShellProps = {
  children: ReactNode
  selected?: boolean
  onClick?: () => void
}

export function BookCardShell({ children, selected = false, onClick }: BookCardShellProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.()
        }
      }}
      className={cn(
        'grid cursor-pointer gap-3 rounded-2xl border border-transparent bg-transparent p-2 text-left transition duration-200 hover:-translate-y-1',
        selected ? 'border-neutral-950/10 bg-white/70 shadow-sm' : 'border-transparent',
      )}
    >
      {children}
    </div>
  )
}
