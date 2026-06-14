import { BookDetailFieldList } from './book-detail-field-list'
import { BookDetailSection } from './book-detail-section'
import { libraryCopy } from '../../library-config'

type BookDetailFieldsProps = {
  pages: number
  statusLabel: string
  updatedAt: string
  fileSize?: string
  createdAt?: string
}

export function BookDetailFields({ pages, statusLabel, updatedAt, fileSize, createdAt }: BookDetailFieldsProps) {
  const unknown = libraryCopy.detail.fallback.unknown

  return (
    <BookDetailSection title={libraryCopy.detail.sections.overview}>
      <BookDetailFieldList
        items={[
          { label: libraryCopy.detail.fields.pages, value: pages },
          { label: libraryCopy.detail.fields.status, value: statusLabel },
          { label: libraryCopy.detail.fields.fileSize, value: fileSize ?? unknown },
          { label: libraryCopy.detail.fields.createdAt, value: createdAt ?? unknown },
          { label: libraryCopy.detail.fields.updatedAt, value: updatedAt },
        ]}
      />
    </BookDetailSection>
  )
}
