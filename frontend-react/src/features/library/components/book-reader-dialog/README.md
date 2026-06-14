# Book Reader Dialog

`book-reader-dialog` owns the lightweight in-app bilingual reader for a library book.

This family is exported through the library public component boundary. The reader is kept ready with the route so opening compare reading does not need a separate component fetch.

- `book-reader-dialog.tsx`: modal shell and reader loading state. It waits for both PDFs to download before creating readable page content.
- `book-reader-pdf-document.ts`: protected full PDF download before PDF.js document creation.
- `book-reader-pdf-page.tsx`: single PDF.js canvas page.
- `book-reader-pdf-page-pair.tsx`: aligned source/translated page row.
- `book-reader-pdfjs.ts`: PDF.js worker setup.
- `book-reader-selectors.ts`: source and translated PDF URL selectors.
- `book-reader-types.ts`: local view types.
- `index.ts`: public exports for this component family.

The component reads protected PDFs with the library API key and downloads the whole PDF before creating the PDF.js document. This intentionally matches the requested old-style behavior where reading starts after the PDF payload is ready, without HTTP Range or preview page loading.

PDF.js auxiliary assets are served from `public/pdfjs`:

- `cmaps`
- `standard_fonts`
- `wasm`
