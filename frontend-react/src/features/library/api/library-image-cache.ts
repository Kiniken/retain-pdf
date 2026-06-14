import { libraryRequestHeaders, libraryResourceUrl } from './library-api-client'

const imageObjectUrlCache = new Map<string, Promise<string>>()

export function loadLibraryImageObjectUrl(pathOrUrl: string) {
  const imageUrl = libraryResourceUrl(pathOrUrl)
  const cached = imageObjectUrlCache.get(imageUrl)

  if (cached) {
    return cached
  }

  const request = fetch(imageUrl, { headers: libraryRequestHeaders() })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`image failed: ${response.status}`)
      }
      return response.blob()
    })
    .then((blob) => URL.createObjectURL(blob))
    .catch((error: unknown) => {
      imageObjectUrlCache.delete(imageUrl)
      throw error
    })

  imageObjectUrlCache.set(imageUrl, request)
  return request
}
