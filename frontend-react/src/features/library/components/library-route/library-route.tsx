import { BookDetailDialog } from '../book-detail-dialog'
import { BookReaderDialog } from '../book-reader-dialog'
import { LibraryHomePage } from '../library-home-page'
import { LibrarySettingsDialog } from '../library-settings-dialog'
import { useLibraryController } from '../../model'

function LibraryToast({ error, message }: { error?: string; message?: string }) {
  const text = error || message

  if (!text) {
    return null
  }

  return (
    <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs text-neutral-600 shadow-lg">
      {text}
    </div>
  )
}

export function LibraryRoute() {
  const library = useLibraryController()
  const { actions, selectedBook } = library
  const detailLoading = library.detailLoadingBookId === selectedBook?.id

  return (
    <main className="h-screen overflow-hidden bg-[#f5f5f7] px-4 py-4 text-neutral-950 sm:px-6 lg:px-8">
      <LibraryHomePage
        books={library.books}
        selectedBookId={library.selectedBookId}
        searchValue={library.searchQuery}
        sortKey={library.sortKey}
        statusFilterKey={library.statusFilterKey}
        selectionMode={library.selectionMode}
        selectedBookIds={library.selectedBookIds}
        onSearchChange={actions.setSearchQuery}
        onSelectSort={actions.setSortKey}
        onSelectStatus={actions.setStatusFilterKey}
        onSelectBook={actions.selectBook}
        onToggleSelectBook={actions.toggleSelectedBook}
        onOpenReader={actions.openReader}
        onDeleteBook={actions.deleteBook}
        onToggleSelectionMode={actions.toggleSelectionMode}
        onDeleteSelectedBooks={actions.deleteSelectedBooks}
        onClearSelection={actions.clearSelection}
        onOpenSettings={() => actions.setSettingsOpen(true)}
      />
      <LibraryToast error={library.loadError} message={library.toastText} />
      <BookDetailDialog
        book={selectedBook}
        open={library.detailOpen}
        readerDisabled={detailLoading}
        downloadDisabled={detailLoading || !selectedBook?.snapshot.pdfReady}
        downloading={library.downloadingBookId === selectedBook?.id}
        deleting={library.deletingBookId === selectedBook?.id}
        loading={detailLoading}
        onClose={() => actions.setDetailOpen(false)}
        onOpenReader={actions.openReader}
        onDownloadPdf={actions.downloadPdf}
        onDownloadArtifact={actions.downloadArtifact}
        onDeleteBook={actions.deleteBook}
      />
      <BookReaderDialog book={selectedBook} open={library.readerOpen} onClose={() => actions.setReaderOpen(false)} />
      <LibrarySettingsDialog open={library.settingsOpen} onClose={() => actions.setSettingsOpen(false)} />
    </main>
  )
}
