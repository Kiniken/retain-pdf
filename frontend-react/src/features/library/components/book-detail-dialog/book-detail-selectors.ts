import { libraryCopy, libraryStatusMeta } from '../../library-config'
import type { LibraryBook } from '../../types'
import type { StatusSnapshot } from '@/features/status'
import type { BookDetailOverviewViewModel, BookDetailViewModel } from './book-detail-types'

export function getBookDetailViewModel(book: LibraryBook): BookDetailViewModel {
  return {
    id: book.id,
    title: book.title,
    coverBook: {
      title: book.title,
      pages: book.pages,
      coverTone: book.coverTone,
      coverUrl: book.coverUrl,
      thumbnailUrl: book.thumbnailUrl,
    },
    overview: getBookDetailOverview(book),
    translation: getBookDetailTranslation(book),
    artifacts: getBookDetailArtifacts(book),
    progress: getBookDetailProgress(book),
  }
}

export function getBookDetailOverview(book: LibraryBook): BookDetailOverviewViewModel {
  const statusMeta = libraryStatusMeta[book.status]

  return {
    title: book.title,
    authors: book.authors,
    description: book.detail?.description ?? libraryCopy.detail.fallback.description,
    tags: book.detail?.tags ?? [],
    pages: book.pages,
    statusLabel: statusMeta.label,
    updatedAt: book.updatedAt,
    fileSize: book.detail?.fileSize,
    createdAt: book.detail?.createdAt,
  }
}

export function getBookDetailArtifacts(book: LibraryBook) {
  return book.detail?.artifacts ?? []
}

export function getBookDetailTranslation(book: LibraryBook) {
  return book.detail
}

export function getBookDetailProgress(book: LibraryBook): StatusSnapshot {
  return book.snapshot
}
