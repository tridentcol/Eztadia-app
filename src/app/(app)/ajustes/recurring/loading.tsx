import { Skeleton } from '@/components/ui/skeleton'

export default function RecurringLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-7 w-44 sm:h-8" />
        <Skeleton className="h-9 w-36 rounded-[8px]" />
      </header>

      <ul className="border-border-default bg-surface flex flex-col rounded-[12px] border">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 ${
              i !== 3 ? 'border-border-default/60 border-b' : ''
            }`}
          >
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-44" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-8 rounded-[8px]" />
              <Skeleton className="h-8 w-8 rounded-[8px]" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
