import type { BookDetailTabKey } from './book-detail-types'

export const bookDetailLayout = {
  dialogClassName: 'max-w-4xl',
  shellClassName: 'grid gap-5',
  bodyClassName: 'grid gap-5 lg:grid-cols-[minmax(160px,220px)_minmax(0,1fr)]',
  coverClassName: 'mx-auto w-full max-w-[220px] lg:mx-0',
  tabsClassName: 'grid min-h-0 content-start',
  tabListClassName: 'max-w-full overflow-x-auto',
  tabContentClassName: 'scrollbar-subtle grid h-[360px] content-start overflow-y-auto pr-1',
  artifactRowClassName: 'grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm',
}

export const bookDetailTabs: Array<{ key: BookDetailTabKey; copyKey: BookDetailTabKey }> = [
  { key: 'overview', copyKey: 'overview' },
  { key: 'translation', copyKey: 'translation' },
  { key: 'artifacts', copyKey: 'artifacts' },
  { key: 'progress', copyKey: 'progress' },
]
