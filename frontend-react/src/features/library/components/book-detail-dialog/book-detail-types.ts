import type { StatusSnapshot } from '@/features/status'
import type { LibraryBookArtifact, LibraryBookDetail } from '../../types'

export type BookDetailTabKey = 'overview' | 'translation' | 'artifacts' | 'progress'

export type BookDetailViewModel = {
  id: string
  title: string
  coverBook: {
    title: string
    pages: number
    coverTone: 'light' | 'medium' | 'dark'
    coverUrl?: string
    thumbnailUrl?: string
  }
  overview: BookDetailOverviewViewModel
  translation?: LibraryBookDetail
  artifacts: LibraryBookArtifact[]
  progress: StatusSnapshot
}

export type BookDetailOverviewViewModel = {
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

export type BookDetailActionState = {
  readerDisabled?: boolean
  downloadDisabled?: boolean
  downloading?: boolean
  deleting?: boolean
  loading?: boolean
}

export type BookDetailActionHandlers = {
  onOpenReader?: (bookId: string) => void
  onDownloadPdf?: (bookId: string) => void
  onDownloadArtifact?: (artifactKey: string) => void
  onDeleteBook?: (bookId: string) => void
}
