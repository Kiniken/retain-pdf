import { Dialog } from '@/components/ui'

import { BookDetailCoverPanel } from './book-detail-cover-panel'
import { BookDetailTabs } from './book-detail-tabs'
import { bookDetailLayout } from './book-detail-config'
import { getBookDetailViewModel } from './book-detail-selectors'
import { libraryCopy } from '../../library-config'
import type { LibraryBook } from '../../types'
import type { BookDetailActionHandlers, BookDetailActionState } from './book-detail-types'

type BookDetailDialogProps = BookDetailActionHandlers &
  BookDetailActionState & {
  book?: LibraryBook
  open: boolean
  onClose: () => void
}

export function BookDetailDialog({
  book,
  open,
  readerDisabled,
  downloadDisabled,
  downloading,
  deleting,
  loading,
  onClose,
  onOpenReader,
  onDownloadPdf,
  onDownloadArtifact,
  onDeleteBook,
}: BookDetailDialogProps) {
  if (!book) {
    return null
  }

  const detail = getBookDetailViewModel(book)

  return (
    <Dialog
      open={open}
      title={detail.title}
      closeLabel={libraryCopy.dialog.close}
      backdropCloseLabel={libraryCopy.dialog.closeBackdrop}
      onClose={onClose}
      className={bookDetailLayout.dialogClassName}
    >
      <div className={bookDetailLayout.shellClassName}>
        <div className={bookDetailLayout.bodyClassName}>
          <BookDetailCoverPanel book={detail.coverBook} />
          <BookDetailTabs
            detail={detail}
            readerDisabled={readerDisabled}
            downloadDisabled={downloadDisabled}
            downloading={downloading}
            deleting={deleting}
            loading={loading}
            onOpenReader={onOpenReader}
            onDownloadPdf={onDownloadPdf}
            onDownloadArtifact={onDownloadArtifact}
            onDeleteBook={onDeleteBook}
          />
        </div>
      </div>
    </Dialog>
  )
}
