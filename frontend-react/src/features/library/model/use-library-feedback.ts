import { useEffect, useState } from 'react'

export function useLibraryFeedback() {
  const [loadError, setLoadError] = useState<string>()
  const [toastText, setToastText] = useState<string>()

  useEffect(() => {
    if (!toastText) {
      return
    }

    const timer = window.setTimeout(() => setToastText(undefined), 2200)
    return () => window.clearTimeout(timer)
  }, [toastText])

  return {
    loadError,
    toastText,
    setLoadError,
    setToastText,
  }
}
