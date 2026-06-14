import type { LibraryActivity } from '../types'
import { libraryCopy } from '../library-config'

type ActivityPanelProps = {
  activities: LibraryActivity[]
}

export function ActivityPanel({ activities }: ActivityPanelProps) {
  return (
    <section className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-neutral-950">{libraryCopy.activity.title}</h2>
        <span className="text-xs font-medium text-neutral-500">{libraryCopy.activity.liveLabel}</span>
      </div>
      <div className="grid gap-3">
        {activities.map((activity) => (
          <article key={activity.id} className="grid gap-1 border-t border-neutral-100 pt-3 first:border-t-0 first:pt-0">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-neutral-950">{activity.title}</h3>
              <span className="text-xs text-neutral-500">{activity.time}</span>
            </div>
            <p className="text-xs leading-relaxed text-neutral-500">{activity.detail}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
