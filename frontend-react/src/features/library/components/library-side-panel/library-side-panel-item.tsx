import type { LibrarySidePanelItem as LibrarySidePanelItemType } from './library-side-panel-types'

type LibrarySidePanelItemProps = {
  item: LibrarySidePanelItemType
  active?: boolean
  onSelect?: (key: string) => void
}

export function LibrarySidePanelItem({ item, active = false, onSelect }: LibrarySidePanelItemProps) {
  const Icon = item.icon

  return (
    <button
      type="button"
      className={[
        'grid min-h-12 grid-cols-[28px_minmax(0,1fr)] items-center gap-2 rounded-2xl px-3 text-left transition hover:bg-neutral-100',
        active ? 'bg-neutral-950 text-white hover:bg-neutral-900' : '',
      ].join(' ')}
      onClick={() => onSelect?.(item.key)}
    >
      <span className={['grid size-7 place-items-center rounded-xl', active ? 'bg-white/15 text-white' : 'bg-neutral-100 text-neutral-600'].join(' ')}>
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0">
        <span className={['block truncate text-sm font-semibold', active ? 'text-white' : 'text-neutral-950'].join(' ')}>{item.label}</span>
        <span className={['block truncate text-xs', active ? 'text-white/65' : 'text-neutral-500'].join(' ')}>{item.description}</span>
      </span>
    </button>
  )
}
