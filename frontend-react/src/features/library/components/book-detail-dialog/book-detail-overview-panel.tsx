import { BookDetailFields } from './book-detail-fields'
import { BookDetailHeading } from './book-detail-heading'

type BookDetailOverviewPanelProps = {
  title: string
  authors: string
  description: string
  tags: string[]
  pages: number
  statusLabel: string
  updatedAt: string
  fileSize?: string
  createdAt?: string
}

export function BookDetailOverviewPanel({
  title,
  authors,
  description,
  tags,
  pages,
  statusLabel,
  updatedAt,
  fileSize,
  createdAt,
}: BookDetailOverviewPanelProps) {
  return (
    <>
      <BookDetailHeading title={title} authors={authors} description={description} tags={tags} />
      <BookDetailFields pages={pages} statusLabel={statusLabel} updatedAt={updatedAt} fileSize={fileSize} createdAt={createdAt} />
    </>
  )
}
