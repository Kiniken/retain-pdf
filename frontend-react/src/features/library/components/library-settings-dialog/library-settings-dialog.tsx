import { Dialog } from '@/components/ui'

import { LibrarySettingsTabs } from './library-settings-tabs'
import { librarySettingsLayout } from './library-settings-config'
import { getLibrarySettingsSections } from './library-settings-selectors'
import { libraryCopy } from '../../library-config'

type LibrarySettingsDialogProps = {
  open: boolean
  onClose: () => void
}

export function LibrarySettingsDialog({ open, onClose }: LibrarySettingsDialogProps) {
  const sections = getLibrarySettingsSections()

  return (
    <Dialog
      open={open}
      title={libraryCopy.settings.title}
      closeLabel={libraryCopy.dialog.close}
      backdropCloseLabel={libraryCopy.dialog.closeBackdrop}
      onClose={onClose}
      className={librarySettingsLayout.dialogClassName}
    >
      <div className={librarySettingsLayout.shellClassName}>
        <LibrarySettingsTabs sections={sections} />
      </div>
    </Dialog>
  )
}
