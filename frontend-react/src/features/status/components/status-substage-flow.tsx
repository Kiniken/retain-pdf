import { cn } from '@/lib/utils'

import { translationSubstages } from '../status-config'
import type { SubstageKey } from '../types'

type StatusSubstageFlowProps = {
  activeSubstage?: SubstageKey | ''
}

export function StatusSubstageFlow({ activeSubstage }: StatusSubstageFlowProps) {
  return (
    <div className="grid w-full max-w-[380px] grid-cols-4 gap-1.5">
      {translationSubstages.map((substage) => {
        const active = activeSubstage === substage.key

        return (
          <span
            key={substage.key}
            className={cn(
              'inline-flex min-h-6 items-center justify-center rounded-full bg-neutral-100 px-2 text-[11px] font-semibold text-neutral-500',
              active && 'bg-neutral-950 text-white',
            )}
          >
            {substage.label}
          </span>
        )
      })}
    </div>
  )
}
