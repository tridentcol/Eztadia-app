import { Skeleton } from '@/components/ui/skeleton'

export default function PresupuestosLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-7 w-36 sm:h-8" />
        <Skeleton className="h-9 w-36 rounded-[8px]" />
      </header>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="border-border-default bg-surface flex flex-col gap-3 rounded-[12px] border p-5"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-3 w-24" />
          </li>
        ))}
      </ul>
    </div>
  )
}
