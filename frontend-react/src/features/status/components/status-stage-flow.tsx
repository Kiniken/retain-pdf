import { cn } from '@/lib/utils'

import { statusStages } from '../status-config'
import type { StageKey } from '../types'

type StatusStageFlowProps = {
  activeStage: StageKey
  selectedStage: StageKey
  onSelectStage?: (stage: StageKey) => void
}

export function StatusStageFlow({ activeStage, selectedStage, onSelectStage }: StatusStageFlowProps) {
  const activeIndex = statusStages.findIndex((stage) => stage.key === activeStage)

  return (
    <div className="mx-auto grid w-full max-w-[360px] grid-cols-4 gap-1.5">
      {statusStages.map((stage, index) => {
        const Icon = stage.icon
        const selected = stage.key === selectedStage
        const done = activeIndex >= 0 && index < activeIndex

        return (
          <button
            key={stage.key}
            type="button"
            onClick={() => onSelectStage?.(stage.key)}
            className={cn(
              'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-full text-xs font-semibold text-neutral-500 transition',
              done && 'bg-neutral-200 text-neutral-700',
              selected && 'bg-neutral-950 text-white shadow-sm',
              !selected && !done && 'bg-neutral-100',
            )}
          >
            <Icon className="size-3.5" />
            {stage.label}
          </button>
        )
      })}
    </div>
  )
}
