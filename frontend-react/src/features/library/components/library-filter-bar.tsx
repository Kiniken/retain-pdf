import type { LibrarySortItem, LibrarySortKey, LibraryStatusFilterItem, LibraryStatusFilterKey } from '../types'
import { libraryCopy } from '../library-config'

type LibraryFilterBarProps = {
  items: LibrarySortItem[]
  selectedKey: LibrarySortKey
  statusItems: LibraryStatusFilterItem[]
  selectedStatusKey: LibraryStatusFilterKey
  onSelect?: (key: LibrarySortKey) => void
  onSelectStatus?: (key: LibraryStatusFilterKey) => void
}

export function LibraryFilterBar({ items, selectedKey, statusItems, selectedStatusKey, onSelect, onSelectStatus }: LibraryFilterBarProps) {
  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-wrap items-center justify-center gap-2">
      <div className="flex rounded-full bg-white/60 p-1 shadow-sm ring-1 ring-neutral-950/[0.04] backdrop-blur">
        {statusItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelectStatus?.(item.key)}
            className={[
              'h-8 rounded-full px-3 text-xs font-medium transition',
              item.key === selectedStatusKey ? 'bg-neutral-950 text-white shadow-sm' : 'bg-transparent text-neutral-500 hover:bg-white/80 hover:text-neutral-950',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex rounded-full bg-white/40 p-1 ring-1 ring-neutral-950/[0.04] backdrop-blur">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect?.(item.key)}
            className={[
              'h-8 rounded-full px-3 text-xs font-medium transition',
              item.key === selectedKey ? 'bg-neutral-950 text-white shadow-sm' : 'bg-transparent text-neutral-500 hover:bg-white/80 hover:text-neutral-950',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>
      <span className="sr-only">{libraryCopy.filter.viewLabel}</span>
    </div>
  )
}
