type BookReaderUrlBook = {
  id: string
}

export function sourcePdfUrl(book: BookReaderUrlBook) {
  return `/api/v1/jobs/${encodeURIComponent(book.id)}/artifacts/source_pdf`
}

export function translatedPdfUrl(book: BookReaderUrlBook) {
  return `/api/v1/jobs/${encodeURIComponent(book.id)}/pdf`
}
