import { cn } from '@/lib/utils'

import type { LibraryNavKey, LibrarySidebarItem } from '../types'

type LibrarySidebarProps = {
  items: LibrarySidebarItem[]
  onSelect?: (key: LibraryNavKey) => void
}

export function LibrarySidebar({ items, onSelect }: LibrarySidebarProps) {
  return (
    <aside className="scrollbar-subtle hidden min-h-0 overflow-auto rounded-[28px] bg-white/80 p-3 lg:block">
      <div className="grid gap-1">
        {items.map((item) => {
          const Icon = item.icon

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelect?.(item.key)}
              className={cn(
                'grid min-h-10 grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl px-3 text-left text-sm font-medium text-neutral-500 transition hover:bg-neutral-100',
                item.active && 'bg-neutral-950 text-white hover:bg-neutral-950',
              )}
            >
              <Icon className={cn('size-4', item.spinning && 'animate-spin')} />
              <span className="truncate">{item.label}</span>
              <span className={cn('text-xs', item.active ? 'text-white/70' : 'text-neutral-400')}>{item.count}</span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
