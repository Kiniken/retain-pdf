type BookCardMetaProps = {
  title: string
  authors: string
}

export function BookCardMeta({ title, authors }: BookCardMetaProps) {
  return (
    <div className="grid min-w-0 gap-1 px-1 text-center">
      <div className="line-clamp-2 min-h-9 text-[13px] font-medium leading-snug text-neutral-950">{title}</div>
      <div className="truncate text-[11px] text-neutral-500">{authors}</div>
    </div>
  )
}
