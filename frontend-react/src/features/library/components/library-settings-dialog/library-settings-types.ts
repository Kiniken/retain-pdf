export type LibrarySettingsSectionKey = 'translation' | 'ocr' | 'files' | 'display'

export type LibrarySettingsSectionView = {
  key: LibrarySettingsSectionKey
  title: string
  description: string
  items: string[]
}
