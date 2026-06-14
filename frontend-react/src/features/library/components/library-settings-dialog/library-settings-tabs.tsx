import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui'

import { LibrarySettingsPanel } from './library-settings-panel'
import { librarySettingsLayout } from './library-settings-config'
import type { LibrarySettingsSectionView } from './library-settings-types'

type LibrarySettingsTabsProps = {
  sections: LibrarySettingsSectionView[]
}

export function LibrarySettingsTabs({ sections }: LibrarySettingsTabsProps) {
  const defaultSection = sections[0]?.key

  if (!defaultSection) {
    return null
  }

  return (
    <Tabs defaultValue={defaultSection} className={librarySettingsLayout.tabsClassName}>
      <TabsList className={librarySettingsLayout.tabsListClassName}>
        {sections.map((section) => (
          <TabsTrigger key={section.key} value={section.key}>
            {section.title}
          </TabsTrigger>
        ))}
      </TabsList>

      {sections.map((section) => (
        <TabsContent key={section.key} value={section.key} className={librarySettingsLayout.tabContentClassName}>
          <LibrarySettingsPanel section={section} />
        </TabsContent>
      ))}
    </Tabs>
  )
}
