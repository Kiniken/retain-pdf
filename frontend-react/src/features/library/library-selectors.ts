import { libraryNavDefinitions, libraryStatusMeta } from './library-config'
import type { LibraryBook, LibraryNavKey, LibrarySidebarItem, LibrarySortKey, LibraryStatusFilterKey } from './types'

export function activeLibraryCount(books: LibraryBook[]) {
  return books.filter((book) => book.status === 'processing' || book.status === 'queued').length
}

export function filterLibraryBooks(books: LibraryBook[], navKey: LibraryNavKey) {
  if (navKey === 'processing' || navKey === 'ready' || navKey === 'queued') {
    return books.filter((book) => book.status === navKey)
  }
  return books
}

export function filterLibraryBooksByQuery(books: LibraryBook[], query: string) {
  const normalized = query.trim().toLowerCase()

  if (!normalized) {
    return books
  }

  return books.filter((book) => {
    const searchable = [
      book.id,
      book.title,
      book.authors,
      book.progressLabel,
      book.updatedAt,
      book.detail?.description,
      book.detail?.workflow,
      book.detail?.sourceLanguage,
      book.detail?.targetLanguage,
      ...(book.detail?.tags ?? []),
      ...(book.detail?.artifacts.map((artifact) => `${artifact.label} ${artifact.fileName ?? ''}`) ?? []),
    ].join(' ').toLowerCase()

    return searchable.includes(normalized)
  })
}

export function filterLibraryBooksByStatus(books: LibraryBook[], statusKey: LibraryStatusFilterKey) {
  if (statusKey === 'all') {
    return books
  }

  return books.filter((book) => book.status === statusKey)
}

export function sortLibraryBooks(books: LibraryBook[], sortKey: LibrarySortKey) {
  return [...books].sort((left, right) => {
    if (sortKey === 'title') {
      return left.title.localeCompare(right.title)
    }
    if (sortKey === 'authors') {
      return left.authors.localeCompare(right.authors)
    }
    if (sortKey === 'pages') {
      return right.pages - left.pages
    }
    return 0
  })
}

export function buildLibrarySidebarItems(books: LibraryBook[], activeKey: LibraryNavKey): LibrarySidebarItem[] {
  const counts: Record<LibraryNavKey, number> = {
    all: books.length,
    processing: books.filter((book) => book.status === 'processing').length,
    ready: books.filter((book) => book.status === 'ready').length,
    queued: books.filter((book) => book.status === 'queued').length,
    authors: new Set(books.map((book) => book.authors)).size,
    tags: 0,
  }

  return libraryNavDefinitions.map((definition) => {
    const statusMeta = definition.key === 'processing' ? libraryStatusMeta.processing : null

    return {
      ...definition,
      count: counts[definition.key],
      active: definition.key === activeKey,
      spinning: Boolean(statusMeta?.spinning),
    }
  })
}
