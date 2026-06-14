import { Plus, Search } from 'lucide-react'

import { Button } from '@/components/ui'

import { libraryCopy } from '../library-config'

type LibraryHeaderProps = {
  totalBooks: number
  activeCount: number
}

export function LibraryHeader({ totalBooks, activeCount }: LibraryHeaderProps) {
  return (
    <header className="grid gap-5 py-1 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div className="grid gap-2">
        <div className="grid gap-1">
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-950 md:text-5xl">{libraryCopy.header.title}</h1>
          <p className="text-sm text-neutral-500">{libraryCopy.header.summary(totalBooks, activeCount)}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" className="min-w-[180px] justify-start text-neutral-500">
          <Search />
          {libraryCopy.header.searchAction}
        </Button>
        <Button>
          <Plus />
          {libraryCopy.header.addAction}
        </Button>
      </div>
    </header>
  )
}
