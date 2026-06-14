import { Progress } from '@/components/ui'

import { progressPercent } from '../status-progress'
import { statusCopy } from '../status-config'
import type { StageProgress } from '../types'

type StatusProgressBlockProps = {
  progress?: StageProgress
}

export function StatusProgressBlock({ progress }: StatusProgressBlockProps) {
  const percent = progressPercent(progress?.current, progress?.total)

  return (
    <div className="grid w-full max-w-[380px] gap-2">
      <Progress value={progress?.indeterminate ? 42 : percent} />
      <div className="text-xs font-medium text-neutral-500">{progress?.text || statusCopy.progress.fallback}</div>
    </div>
  )
}
