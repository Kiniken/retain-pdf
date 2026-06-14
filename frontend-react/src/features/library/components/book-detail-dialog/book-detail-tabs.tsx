import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui'

import { BookDetailArtifactsPanel } from './book-detail-artifacts-panel'
import { BookDetailOverviewPanel } from './book-detail-overview-panel'
import { BookDetailStatusPanel } from './book-detail-status-panel'
import { BookDetailTranslationPanel } from './book-detail-translation-panel'
import { bookDetailLayout, bookDetailTabs } from './book-detail-config'
import { libraryCopy } from '../../library-config'
import type { BookDetailActionHandlers, BookDetailActionState, BookDetailViewModel } from './book-detail-types'

type BookDetailTabsProps = BookDetailActionHandlers &
  BookDetailActionState & {
    detail: BookDetailViewModel
  }

export function BookDetailTabs({
  detail,
  readerDisabled,
  downloadDisabled,
  downloading,
  deleting,
  loading,
  onOpenReader,
  onDownloadPdf,
  onDownloadArtifact,
  onDeleteBook,
}: BookDetailTabsProps) {
  return (
    <Tabs defaultValue="overview" className={bookDetailLayout.tabsClassName}>
      {loading ? <div className="mb-3 text-xs text-neutral-500">{libraryCopy.detail.loading}</div> : null}
      <TabsList className={bookDetailLayout.tabListClassName}>
        {bookDetailTabs.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key}>{libraryCopy.detail.tabs[tab.copyKey]}</TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className={`${bookDetailLayout.tabContentClassName} gap-4`}>
        <BookDetailOverviewPanel {...detail.overview} />
      </TabsContent>

      <TabsContent value="translation" className={bookDetailLayout.tabContentClassName}>
        <BookDetailTranslationPanel detail={detail.translation} />
      </TabsContent>

      <TabsContent value="artifacts" className={bookDetailLayout.tabContentClassName}>
        <BookDetailArtifactsPanel
          bookId={detail.id}
          artifacts={detail.artifacts}
          readerDisabled={readerDisabled}
          downloadDisabled={downloadDisabled}
          downloading={downloading}
          deleting={deleting}
          loading={loading}
          onOpenReader={onOpenReader}
          onDownloadPdf={onDownloadPdf}
          onDownloadArtifact={onDownloadArtifact}
          onDeleteBook={onDeleteBook}
        />
      </TabsContent>

      <TabsContent value="progress" className={bookDetailLayout.tabContentClassName}>
        <BookDetailStatusPanel snapshot={detail.progress} />
      </TabsContent>
    </Tabs>
  )
}
