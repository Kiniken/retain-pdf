import { BookDetailProgressSummary } from './book-detail-progress-summary'
import type { StatusSnapshot } from '@/features/status'

type BookDetailStatusPanelProps = {
  snapshot: StatusSnapshot
}

export function BookDetailStatusPanel({ snapshot }: BookDetailStatusPanelProps) {
  return <BookDetailProgressSummary snapshot={snapshot} />
}
