import type { ReactNode } from 'react'

type BookDetailSectionProps = {
  title: string
  children: ReactNode
}

export function BookDetailSection({ title, children }: BookDetailSectionProps) {
  return (
    <section className="grid gap-3 rounded-2xl border border-neutral-100 bg-neutral-50/70 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">{title}</h3>
      {children}
    </section>
  )
}
