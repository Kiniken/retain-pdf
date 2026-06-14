import { libraryCopy } from '../../library-config'
import type { LibrarySettingsSectionView } from './library-settings-types'

export function getLibrarySettingsSections(): LibrarySettingsSectionView[] {
  return libraryCopy.settings.sections
}
