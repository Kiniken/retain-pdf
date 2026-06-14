import { Progress } from '@/components/ui'
import { cn } from '@/lib/utils'
import { progressPercent, statusStages } from '@/features/status'

import { libraryCopy } from '../../library-config'
import type { StatusSnapshot } from '@/features/status'

type BookDetailProgressSummaryProps = {
  snapshot: StatusSnapshot
}

export function BookDetailProgressSummary({ snapshot }: BookDetailProgressSummaryProps) {
  const activeIndex = statusStages.findIndex((stage) => stage.key === snapshot.activeStage)

  return (
    <section className="grid gap-2.5 rounded-2xl border border-neutral-100 bg-neutral-50/70 p-3">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">{libraryCopy.detail.sections.progress}</h3>
        <span className="text-xs font-semibold text-neutral-700">{snapshot.elapsedText}</span>
      </div>

      <div className="grid gap-1.5">
        {statusStages.map((stage, index) => {
          const Icon = stage.icon
          const progress = snapshot.stageProgress[stage.key]
          const selected = stage.key === snapshot.selectedStage
          const active = stage.key === snapshot.activeStage
          const done = activeIndex >= 0 && index < activeIndex
          const percent = progress?.indeterminate ? 42 : progressPercent(progress?.current, progress?.total)

          return (
            <div key={stage.key} className="grid gap-1 rounded-xl bg-white px-2.5 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      'grid size-6 shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-500',
                      done && 'bg-neutral-200 text-neutral-700',
                      active && 'bg-neutral-950 text-white',
                    )}
                  >
                    <Icon className="size-3" />
                  </span>
                  <span className="truncate text-xs font-semibold text-neutral-950">{stage.label}</span>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-neutral-500">
                  {active ? libraryCopy.detail.progressState.active : done ? libraryCopy.detail.progressState.done : selected ? libraryCopy.detail.progressState.selected : libraryCopy.detail.progressState.pending}
                </span>
              </div>
              <Progress value={percent} className="h-1" />
              <div className="text-[10px] font-medium leading-tight text-neutral-500">{progress?.text ?? libraryCopy.detail.fallback.unknown}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
