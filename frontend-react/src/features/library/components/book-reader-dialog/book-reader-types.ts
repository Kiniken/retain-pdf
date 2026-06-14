import type { LibraryBook } from '../../types'

export type BookReaderBook = Pick<LibraryBook, 'id' | 'title' | 'pages' | 'detail'>

export type ReaderPdfState = {
  loading: boolean
  loadedCount: number
  sourceStatus?: string
  translatedStatus?: string
  error?: string
}

export type ReaderPaneLoadPayload = {
  pageCount: number
}
