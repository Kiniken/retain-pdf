import { BookDetailFieldList } from './book-detail-field-list'
import { BookDetailSection } from './book-detail-section'
import { libraryCopy } from '../../library-config'
import type { LibraryBookDetail } from '../../types'

type BookDetailTranslationProps = {
  detail?: LibraryBookDetail
}

export function BookDetailTranslation({ detail }: BookDetailTranslationProps) {
  const unknown = libraryCopy.detail.fallback.unknown

  return (
    <BookDetailSection title={libraryCopy.detail.sections.translation}>
      <BookDetailFieldList
        items={[
          { label: libraryCopy.detail.fields.workflow, value: detail?.workflow ?? unknown },
          { label: libraryCopy.detail.fields.language, value: detail ? `${detail.sourceLanguage} -> ${detail.targetLanguage}` : unknown },
          { label: libraryCopy.detail.fields.ocrProvider, value: detail?.ocrProvider ?? unknown },
          { label: libraryCopy.detail.fields.translationEngine, value: detail?.translationEngine ?? unknown },
        ]}
      />
    </BookDetailSection>
  )
}
