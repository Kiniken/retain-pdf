import { BookCard } from '../book-card'
import type { LibraryBook } from '../../types'

type BookGridProps = {
  books: LibraryBook[]
  selectedBookId?: string
  selectionMode?: boolean
  selectedBookIds?: Set<string>
  onSelectBook?: (book: LibraryBook) => void
  onToggleSelectBook?: (book: LibraryBook) => void
  onOpenReader?: (book: LibraryBook) => void
  onDeleteBook?: (book: LibraryBook) => void
}

export function BookGrid({
  books,
  selectedBookId,
  selectionMode = false,
  selectedBookIds = new Set(),
  onSelectBook,
  onToggleSelectBook,
  onOpenReader,
  onDeleteBook,
}: BookGridProps) {
  return (
    <section className="scrollbar-subtle min-h-0 overflow-auto px-1 pt-1">
      <div className="mx-auto grid max-w-[1060px] grid-cols-2 content-start gap-x-7 gap-y-8 pb-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            selected={book.id === selectedBookId}
            selectionMode={selectionMode}
            selectionChecked={selectedBookIds.has(book.id)}
            onSelect={onSelectBook}
            onToggleSelect={onToggleSelectBook}
            onOpenReader={onOpenReader}
            onDelete={onDeleteBook}
          />
        ))}
      </div>
    </section>
  )
}
