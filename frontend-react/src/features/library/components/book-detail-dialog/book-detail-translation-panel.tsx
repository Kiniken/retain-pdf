import { BookDetailTranslation } from './book-detail-translation'
import type { LibraryBookDetail } from '../../types'

type BookDetailTranslationPanelProps = {
  detail?: LibraryBookDetail
}

export function BookDetailTranslationPanel({ detail }: BookDetailTranslationPanelProps) {
  return <BookDetailTranslation detail={detail} />
}
