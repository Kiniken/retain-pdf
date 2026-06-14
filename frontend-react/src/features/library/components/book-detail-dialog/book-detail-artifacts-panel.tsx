import { BookDetailActions } from './book-detail-actions'
import { BookDetailArtifacts } from './book-detail-artifacts'
import { BookDetailSection } from './book-detail-section'
import { libraryCopy } from '../../library-config'
import type { LibraryBookArtifact } from '../../types'
import type { BookDetailActionHandlers, BookDetailActionState } from './book-detail-types'

type BookDetailArtifactsPanelProps = BookDetailActionHandlers &
  BookDetailActionState & {
    bookId: string
    artifacts: LibraryBookArtifact[]
  }

export function BookDetailArtifactsPanel({
  bookId,
  artifacts,
  readerDisabled,
  downloadDisabled,
  downloading,
  deleting,
  onOpenReader,
  onDownloadPdf,
  onDownloadArtifact,
  onDeleteBook,
}: BookDetailArtifactsPanelProps) {
  return (
    <BookDetailSection title={libraryCopy.detail.sections.artifacts}>
      <BookDetailArtifacts artifacts={artifacts} onDownloadArtifact={onDownloadArtifact} />
      <BookDetailActions
        bookId={bookId}
        readerDisabled={readerDisabled}
        downloadDisabled={downloadDisabled}
        downloading={downloading}
        deleting={deleting}
        onOpenReader={onOpenReader}
        onDownloadPdf={onDownloadPdf}
        onDeleteBook={onDeleteBook}
      />
    </BookDetailSection>
  )
}
