type BookDetailHeadingProps = {
  title: string
  authors: string
  description?: string
  tags?: string[]
}

export function BookDetailHeading({ title, authors, description, tags = [] }: BookDetailHeadingProps) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        <h3 className="text-lg font-semibold leading-tight text-neutral-950">{title}</h3>
        <p className="text-sm text-neutral-500">{authors}</p>
      </div>
      {description ? <p className="text-sm leading-6 text-neutral-600">{description}</p> : null}
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
