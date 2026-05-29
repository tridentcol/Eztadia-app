import { Skeleton } from '@/components/ui/skeleton'

export default function InsightsLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-7 w-28 sm:h-8" />
        <Skeleton className="h-9 w-36 rounded-[8px]" />
      </header>

      <div className="flex gap-2 overflow-x-auto">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-[8px]" />
        ))}
      </div>

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="border-border-default bg-surface flex flex-col gap-3 rounded-[12px] border p-5"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="size-2 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 w-20 rounded-[8px]" />
              <Skeleton className="h-8 w-16 rounded-[8px]" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
