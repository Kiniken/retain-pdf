import { Download, FileText } from 'lucide-react'

import { bookDetailLayout } from './book-detail-config'
import { libraryCopy } from '../../library-config'
import type { LibraryBookArtifact } from '../../types'

type BookDetailArtifactRowProps = {
  artifact: LibraryBookArtifact
  onDownloadArtifact?: (artifactKey: string) => void
}

export function BookDetailArtifactRow({ artifact, onDownloadArtifact }: BookDetailArtifactRowProps) {
  const downloadable = artifact.state === 'ready' && artifact.downloadUrl

  return (
    <div className={bookDetailLayout.artifactRowClassName}>
      <FileText className="size-4 text-neutral-500" />
      <div className="min-w-0">
        <div className="truncate font-medium text-neutral-950">{artifact.label}</div>
        <div className="truncate text-xs text-neutral-500">{artifact.detail}</div>
      </div>
      {downloadable ? (
        <button
          type="button"
          className="grid size-8 place-items-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950"
          aria-label={`${libraryCopy.detail.actions.downloadArtifact} ${artifact.label}`}
          onClick={() => onDownloadArtifact?.(artifact.key)}
        >
          <Download className="size-4" />
        </button>
      ) : (
        <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600">
          {libraryCopy.detail.artifactState[artifact.state]}
        </span>
      )}
    </div>
  )
}
