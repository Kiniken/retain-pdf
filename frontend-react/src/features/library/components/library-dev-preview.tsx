import { BookCard } from './book-card'
import { LibraryTopBar } from './library-top-bar'
import { StatusCard } from '@/features/status'
import { libraryCopy } from '../library-config'
import type { LibraryBook } from '../types'

type LibraryDevPreviewProps = {
  books: LibraryBook[]
}

export function LibraryDevPreview({ books }: LibraryDevPreviewProps) {
  const previewBooks = books.slice(0, 3)
  const statusBook = previewBooks[0]

  return (
    <section className="scrollbar-subtle grid max-h-full gap-5 overflow-auto rounded-[28px] bg-white/70 p-5">
      <div className="grid gap-1">
        <h2 className="text-sm font-semibold text-neutral-950">{libraryCopy.devPreview.title}</h2>
      </div>

      <div className="grid gap-3">
        <div className="text-xs font-semibold text-neutral-500">{libraryCopy.devPreview.topBarTitle}</div>
        <LibraryTopBar
          appName={libraryCopy.topBar.appName}
          searchValue=""
          searchPlaceholder={libraryCopy.topBar.searchPlaceholder}
          settingsLabel={libraryCopy.topBar.settingsLabel}
        />
      </div>

      <div className="grid gap-3">
        <div className="text-xs font-semibold text-neutral-500">{libraryCopy.devPreview.bookCardsTitle}</div>
        <div className="grid grid-cols-3 gap-3">
          {previewBooks.map((book) => (
            <BookCard key={book.id} book={book} selected={book.id === statusBook?.id} />
          ))}
        </div>
      </div>

      {statusBook ? (
        <div className="grid gap-3">
          <div className="text-xs font-semibold text-neutral-500">{libraryCopy.devPreview.statusTitle}</div>
          <StatusCard snapshot={statusBook.snapshot} />
        </div>
      ) : null}
    </section>
  )
}
