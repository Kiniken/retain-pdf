import { BookOpen, Download, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui'

import { libraryCopy } from '../../library-config'
import type { BookDetailActionHandlers, BookDetailActionState } from './book-detail-types'

type BookDetailActionsProps = BookDetailActionHandlers &
  BookDetailActionState & {
    bookId: string
  }

export function BookDetailActions({
  bookId,
  readerDisabled,
  downloadDisabled,
  downloading,
  deleting,
  onOpenReader,
  onDownloadPdf,
  onDeleteBook,
}: BookDetailActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" disabled={readerDisabled} onClick={() => onOpenReader?.(bookId)}>
        <BookOpen />
        {libraryCopy.detail.actions.reader}
      </Button>
      <Button size="sm" disabled={downloadDisabled || downloading} onClick={() => onDownloadPdf?.(bookId)}>
        <Download className={downloading ? 'animate-pulse' : undefined} />
        {downloading ? libraryCopy.detail.actions.downloadingPdf : libraryCopy.detail.actions.downloadPdf}
      </Button>
      <Button variant="ghost" size="sm" disabled={deleting} onClick={() => onDeleteBook?.(bookId)}>
        <Trash2 className={deleting ? 'animate-pulse' : undefined} />
        {deleting ? libraryCopy.detail.actions.deletingBook : libraryCopy.detail.actions.deleteBook}
      </Button>
    </div>
  )
}
