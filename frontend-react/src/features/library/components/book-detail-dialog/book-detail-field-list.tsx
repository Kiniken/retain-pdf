type BookDetailFieldItem = {
  label: string
  value: string | number
}

type BookDetailFieldListProps = {
  items: BookDetailFieldItem[]
}

export function BookDetailFieldList({ items }: BookDetailFieldListProps) {
  return (
    <div className="grid gap-2 text-sm">
      {items.map((item, index) => (
        <div key={item.label} className={index === items.length - 1 ? 'flex justify-between gap-4' : 'flex justify-between gap-4 border-b border-neutral-100 pb-2'}>
          <span className="text-neutral-500">{item.label}</span>
          <span className="font-medium text-neutral-950">{item.value}</span>
        </div>
      ))}
    </div>
  )
}
