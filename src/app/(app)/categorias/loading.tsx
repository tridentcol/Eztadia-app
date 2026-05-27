import { Skeleton } from '@/components/ui/skeleton'

export default function CategoriasLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-7 w-32 sm:h-8" />
        <Skeleton className="h-9 w-36 rounded-[8px]" />
      </header>

      <div className="flex gap-2 overflow-x-auto">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 shrink-0 rounded-[8px]" />
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <li
              key={i}
              className="border-border-default bg-surface flex items-center gap-3 rounded-[12px] border p-3.5"
            >
              <Skeleton className="size-8 rounded-[8px]" />
              <Skeleton className="h-3.5 flex-1" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
