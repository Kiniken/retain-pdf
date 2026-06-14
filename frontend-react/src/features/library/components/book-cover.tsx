import { useEffect, useMemo, useState } from 'react'

import type { LibraryBook } from '../types'
import { loadLibraryImageObjectUrl } from '../api'
import { libraryCopy } from '../library-config'

type BookCoverBook = Pick<LibraryBook, 'title' | 'pages' | 'coverTone' | 'coverUrl' | 'thumbnailUrl'>

type BookCoverProps = {
  book: BookCoverBook
  imageKind?: 'cover' | 'thumbnail'
}

const toneClass: Record<BookCoverBook['coverTone'], string> = {
  light: 'bg-neutral-100 text-neutral-950',
  medium: 'bg-neutral-300 text-neutral-950',
  dark: 'bg-neutral-950 text-white',
}

export function BookCover({ book, imageKind = 'thumbnail' }: BookCoverProps) {
  const imageUrl = imageKind === 'cover' ? book.coverUrl || book.thumbnailUrl : book.thumbnailUrl || book.coverUrl
  const [failedImageUrl, setFailedImageUrl] = useState<string>()
  const [loadedImage, setLoadedImage] = useState<{ sourceUrl: string; objectUrl: string }>()
  const objectUrl = loadedImage && loadedImage.sourceUrl === imageUrl ? loadedImage.objectUrl : undefined
  const imageFailed = failedImageUrl === imageUrl
  const fallbackKey = useMemo(() => `${book.title}-${book.pages}-${book.coverTone}`, [book.coverTone, book.pages, book.title])

  useEffect(() => {
    if (!imageUrl) {
      return
    }

    loadLibraryImageObjectUrl(imageUrl)
      .then((nextObjectUrl) => {
        setLoadedImage({ sourceUrl: imageUrl, objectUrl: nextObjectUrl })
      })
      .catch(() => {
        setFailedImageUrl(imageUrl)
      })
  }, [imageUrl])

  if (objectUrl && !imageFailed) {
    return (
      <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-neutral-100 shadow-[0_14px_28px_rgba(0,0,0,0.10)]">
        <img
          src={objectUrl}
          alt={book.title}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailedImageUrl(imageUrl)}
        />
      </div>
    )
  }

  return (
    <div key={fallbackKey} className={`relative grid aspect-[3/4] overflow-hidden rounded-md p-4 shadow-[0_14px_28px_rgba(0,0,0,0.10)] ${toneClass[book.coverTone]}`}>
      <div className="absolute inset-y-0 left-0 w-2 bg-white/20" />
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="grid gap-2">
          <div className="h-px w-10 bg-current opacity-60" />
          <div className="text-xs font-semibold uppercase leading-tight tracking-[0.18em] opacity-70">{libraryCopy.cover.brand}</div>
        </div>
        <div className="grid gap-2">
          <div className="text-[15px] font-semibold leading-tight">{book.title}</div>
          <div className="text-xs opacity-70">{book.pages} {libraryCopy.cover.pageUnit}</div>
        </div>
      </div>
    </div>
  )
}
