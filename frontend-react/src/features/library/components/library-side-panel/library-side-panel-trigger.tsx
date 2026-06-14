import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

import { librarySidePanelLayout } from './library-side-panel-config'

type LibrarySidePanelTriggerProps = {
  expanded: boolean
  label: string
  onClick: () => void
}

export function LibrarySidePanelTrigger({ expanded, label, onClick }: LibrarySidePanelTriggerProps) {
  const Icon = expanded ? PanelLeftClose : PanelLeftOpen

  return (
    <button type="button" className={librarySidePanelLayout.triggerClassName} aria-label={label} onClick={onClick}>
      <Icon className="size-4" />
    </button>
  )
}
