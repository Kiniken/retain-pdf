import { LibrarySidePanelItem } from './library-side-panel-item'
import { LibrarySidePanelTrigger } from './library-side-panel-trigger'
import { librarySidePanelLayout } from './library-side-panel-config'
import { libraryCopy } from '../../library-config'
import type { LibrarySidePanelItem as LibrarySidePanelItemType } from './library-side-panel-types'

type LibrarySidePanelProps = {
  expanded: boolean
  items: LibrarySidePanelItemType[]
  selectionMode?: boolean
  selectedCount?: number
  onToggle: () => void
  onSelectItem?: (key: string) => void
  onDeleteSelected?: () => void
  onClearSelection?: () => void
}

export function LibrarySidePanel({
  expanded,
  items,
  selectionMode = false,
  selectedCount = 0,
  onToggle,
  onSelectItem,
  onDeleteSelected,
  onClearSelection,
}: LibrarySidePanelProps) {
  return (
    <aside className={librarySidePanelLayout.shellClassName}>
      {expanded ? (
        <button
          type="button"
          className={librarySidePanelLayout.backdropClassName}
          aria-label={libraryCopy.sidePanel.closeLabel}
          onClick={onToggle}
        />
      ) : null}
      <div className={librarySidePanelLayout.triggerWrapClassName}>
        <LibrarySidePanelTrigger
          expanded={expanded}
          label={expanded ? libraryCopy.sidePanel.closeLabel : libraryCopy.sidePanel.openLabel}
          onClick={onToggle}
        />
      </div>
      {expanded ? (
        <div className={librarySidePanelLayout.panelClassName}>
          <div className="px-1 pb-1 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">{libraryCopy.sidePanel.title}</div>
          <div className="grid gap-1">
            {items.map((item) => (
              <LibrarySidePanelItem
                key={item.key}
                item={item}
                active={item.key === 'selection' && selectionMode}
                onSelect={onSelectItem}
              />
            ))}
          </div>
          {selectionMode ? (
            <div className="mt-2 grid gap-2 border-t border-neutral-100 pt-3">
              <div className="px-1 text-xs font-medium text-neutral-500">{libraryCopy.selection.selectedCount(selectedCount)}</div>
              <button
                type="button"
                className="h-9 rounded-full bg-neutral-950 px-3 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-40"
                disabled={!selectedCount}
                onClick={onDeleteSelected}
              >
                {libraryCopy.selection.deleteSelected}
              </button>
              <button
                type="button"
                className="h-9 rounded-full px-3 text-xs font-semibold text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950"
                onClick={onClearSelection}
              >
                {libraryCopy.selection.clear}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  )
}
