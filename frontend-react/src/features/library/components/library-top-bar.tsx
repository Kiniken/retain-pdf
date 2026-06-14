import { BookOpen, Search, Settings } from 'lucide-react'

import { Button } from '@/components/ui'

type LibraryTopBarProps = {
  appName: string
  searchValue: string
  searchPlaceholder: string
  settingsLabel: string
  onSearchChange?: (value: string) => void
  onOpenSettings?: () => void
}

export function LibraryTopBar({ appName, searchValue, searchPlaceholder, settingsLabel, onSearchChange, onOpenSettings }: LibraryTopBarProps) {
  return (
    <header className="mx-auto grid w-full max-w-[760px] grid-cols-[auto_minmax(180px,1fr)_auto] items-center gap-3 rounded-[28px] bg-white/70 px-3 py-2 shadow-sm ring-1 ring-neutral-950/[0.04] backdrop-blur">
      <div className="inline-flex items-center gap-2 justify-self-start text-sm font-semibold text-neutral-950">
        <span className="grid size-8 place-items-center rounded-2xl bg-neutral-950 text-white">
          <BookOpen className="size-3.5" />
        </span>
        <span className="hidden sm:inline">{appName}</span>
      </div>
      <label className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
        <input
          id="library-search"
          name="library-search"
          type="search"
          value={searchValue}
          placeholder={searchPlaceholder}
          onChange={(event) => onSearchChange?.(event.currentTarget.value)}
          className="h-9 w-full rounded-full border border-transparent bg-neutral-100/80 pl-10 pr-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-200 focus:bg-white focus:shadow-sm"
        />
      </label>
      <Button variant="ghost" size="icon" className="size-9 justify-self-end bg-transparent" aria-label={settingsLabel} onClick={onOpenSettings}>
        <Settings />
      </Button>
    </header>
  )
}
