import { BookCover } from '../book-cover'
import { bookDetailLayout } from './book-detail-config'
import type { BookDetailViewModel } from './book-detail-types'

type BookDetailCoverPanelProps = {
  book: BookDetailViewModel['coverBook']
}

export function BookDetailCoverPanel({ book }: BookDetailCoverPanelProps) {
  return (
    <aside className={bookDetailLayout.coverClassName}>
      <BookCover book={book} imageKind="cover" />
    </aside>
  )
}
