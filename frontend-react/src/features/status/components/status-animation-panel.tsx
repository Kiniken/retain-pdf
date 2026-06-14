import { Loader2 } from 'lucide-react'

type StatusAnimationPanelProps = {
  errorText?: string
}

export function StatusAnimationPanel({ errorText }: StatusAnimationPanelProps) {
  return (
    <>
      {errorText ? (
        <div className="line-clamp-2 w-full max-w-[360px] rounded-2xl bg-neutral-100 px-3 py-2 text-xs font-semibold leading-relaxed text-neutral-950">
          {errorText}
        </div>
      ) : null}

      <div className="grid h-32 place-items-center">
        <div className="grid size-24 place-items-center rounded-full border border-neutral-200">
          <Loader2 className="size-9 animate-spin text-neutral-950" />
        </div>
      </div>
    </>
  )
}
