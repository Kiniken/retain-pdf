import type { StatusSnapshot } from '@/features/status'
import type { LucideIcon } from 'lucide-react'

export type LibraryBookStatus = 'processing' | 'ready' | 'queued'
export type LibraryNavKey = 'all' | 'processing' | 'ready' | 'queued' | 'authors' | 'tags'
export type LibraryStatusFilterKey = 'all' | LibraryBookStatus
export type LibrarySortKey = 'recent' | 'title' | 'authors' | 'pages'

export type LibraryBook = {
  id: string
  title: string
  authors: string
  pages: number
  status: LibraryBookStatus
  updatedAt: string
  progressLabel: string
  coverTone: 'light' | 'medium' | 'dark'
  coverUrl?: string
  thumbnailUrl?: string
  detail?: LibraryBookDetail
  snapshot: StatusSnapshot
}

export type LibraryBookDetail = {
  sourceLanguage: string
  targetLanguage: string
  workflow: string
  ocrProvider: string
  translationEngine: string
  fileSize: string
  createdAt: string
  description: string
  tags: string[]
  artifacts: LibraryBookArtifact[]
}

export type LibraryBookArtifact = {
  key: string
  label: string
  state: 'ready' | 'processing' | 'queued'
  detail: string
  kind?: string
  fileName?: string
  sizeBytes?: number
  downloadUrl?: string
}

export type LibraryActivity = {
  id: string
  title: string
  detail: string
  time: string
}

export type LibrarySidebarItem = {
  key: LibraryNavKey
  label: string
  count: number
  active?: boolean
  spinning?: boolean
  icon: LucideIcon
}

export type LibrarySortItem = {
  key: LibrarySortKey
  label: string
}

export type LibraryStatusFilterItem = {
  key: LibraryStatusFilterKey
  label: string
}
