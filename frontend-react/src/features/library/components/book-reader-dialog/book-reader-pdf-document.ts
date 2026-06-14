import { libraryRequestHeaders, libraryResourceUrl } from '../../api'
import { pdfjs } from './book-reader-pdfjs'

type ReaderPdfLoadHandle = {
  cancel: () => void
  promise: Promise<pdfjs.PDFDocumentProxy>
}

type ReaderPdfLoadProgress = {
  phase: 'downloading' | 'parsing' | 'ready' | 'failed'
  bytes?: number
  message?: string
}

type ReaderPdfLoadOptions = {
  onProgress?: (progress: ReaderPdfLoadProgress) => void
}

function pdfRequestHeaders() {
  return {
    ...libraryRequestHeaders(),
    Accept: 'application/pdf,*/*',
  }
}

function debugLoad(label: string | undefined, startedAt: number, bytes: number) {
  if (import.meta.env.DEV && label) {
    console.debug(`[reader] ${label} PDF downloaded ${bytes}B and ready in ${Math.round(performance.now() - startedAt)}ms`)
  }
}

export function loadPdfDocument(pathOrUrl: string, label?: string, options: ReaderPdfLoadOptions = {}): ReaderPdfLoadHandle {
  const url = libraryResourceUrl(pathOrUrl)
  const startedAt = performance.now()
  const controller = new AbortController()
  let loadingTask: pdfjs.PDFDocumentLoadingTask | null = null

  if (import.meta.env.DEV && label) {
    console.debug(`[reader] ${label} PDF full download url ${url}`)
  }

  const promise = fetch(url, {
    headers: pdfRequestHeaders(),
    signal: controller.signal,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`PDF download failed: ${response.status}`)
      }

      options.onProgress?.({ phase: 'downloading' })
      return response.arrayBuffer()
    })
    .then((buffer) => {
      const data = new Uint8Array(buffer)
      options.onProgress?.({ phase: 'parsing', bytes: data.byteLength })
      loadingTask = pdfjs.getDocument({
        data,
        cMapPacked: true,
        cMapUrl: '/pdfjs/cmaps/',
        standardFontDataUrl: '/pdfjs/standard_fonts/',
        wasmUrl: '/pdfjs/wasm/',
        disableRange: true,
        disableStream: true,
        disableAutoFetch: true,
      })

      return loadingTask.promise.then((document) => {
        debugLoad(label, startedAt, data.byteLength)
        options.onProgress?.({ phase: 'ready', bytes: data.byteLength })
        return document
      })
    })
    .catch((error: unknown) => {
      options.onProgress?.({
        phase: 'failed',
        message: error instanceof Error ? error.message : 'PDF load failed',
      })
      throw error
    })

  return {
    cancel: () => {
      if (import.meta.env.DEV && label) {
        console.debug(`[reader] ${label} PDF full download canceled`)
      }
      controller.abort()
      void loadingTask?.destroy()
    },
    promise,
  }
}
