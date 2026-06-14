import { BookDetailArtifactRow } from './book-detail-artifact-row'
import type { LibraryBookArtifact } from '../../types'

type BookDetailArtifactsProps = {
  artifacts: LibraryBookArtifact[]
  onDownloadArtifact?: (artifactKey: string) => void
}

export function BookDetailArtifacts({ artifacts, onDownloadArtifact }: BookDetailArtifactsProps) {
  return (
    <div className="grid gap-2">
      {artifacts.map((artifact) => (
        <BookDetailArtifactRow key={artifact.key} artifact={artifact} onDownloadArtifact={onDownloadArtifact} />
      ))}
    </div>
  )
}
