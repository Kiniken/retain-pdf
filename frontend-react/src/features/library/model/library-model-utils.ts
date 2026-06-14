export function mockLibraryEnabled() {
  return import.meta.env.VITE_RETAIN_USE_MOCK_LIBRARY === '1'
}

export function normalizedBookId(bookId: string) {
  return bookId.endsWith('-ocr') ? bookId.slice(0, -4) : bookId
}
