import { librarySettingsLayout } from './library-settings-config'
import type { LibrarySettingsSectionView } from './library-settings-types'

type LibrarySettingsPanelProps = {
  section: LibrarySettingsSectionView
}

export function LibrarySettingsPanel({ section }: LibrarySettingsPanelProps) {
  return (
    <section className={librarySettingsLayout.panelClassName}>
      <div className="grid gap-1">
        <h3 className="text-sm font-semibold text-neutral-950">{section.title}</h3>
        <p className="text-sm leading-6 text-neutral-500">{section.description}</p>
      </div>
      <div className="grid gap-2">
        {section.items.map((item) => (
          <div key={item} className="rounded-xl bg-white px-3 py-2 text-sm text-neutral-600">
            {item}
          </div>
        ))}
      </div>
    </section>
  )
}
