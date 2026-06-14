import { BookOpen } from 'lucide-react'

import { libraryCopy } from '../library-config'

export function LibraryEmptyState() {
  return (
    <div className="grid h-full place-items-center rounded-[28px] border border-dashed border-neutral-200 bg-white/60 px-6 text-center">
      <div className="grid max-w-sm gap-3 justify-items-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-neutral-100 text-neutral-500">
          <BookOpen className="size-5" />
        </span>
        <div className="grid gap-1">
          <h2 className="text-sm font-semibold text-neutral-950">{libraryCopy.empty.title}</h2>
          <p className="text-sm leading-6 text-neutral-500">{libraryCopy.empty.description}</p>
        </div>
      </div>
    </div>
  )
}
