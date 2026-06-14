import { Home } from 'lucide-react'

import { Button } from '@/components/ui'
import { statusCopy } from '../status-config'

type StatusCardHeaderProps = {
  elapsedText: string
}

export function StatusCardHeader({ elapsedText }: StatusCardHeaderProps) {
  return (
    <header className="mx-auto grid w-full max-w-[520px] grid-cols-[minmax(92px,1fr)_auto_minmax(92px,1fr)] items-center gap-3">
      <Button variant="outline" size="sm" className="justify-self-start">
        {statusCopy.actions.cancel}
      </Button>
      <div className="text-sm font-semibold text-neutral-950">{elapsedText}</div>
      <Button variant="outline" size="sm" className="justify-self-end">
        <Home />
        {statusCopy.actions.home}
      </Button>
    </header>
  )
}
