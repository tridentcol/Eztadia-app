import { Skeleton } from '@/components/ui/skeleton'

export default function CuentasLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-7 w-32 sm:h-8" />
        <Skeleton className="h-9 w-32 rounded-[8px]" />
      </header>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="border-border-default bg-surface flex flex-col gap-3 rounded-[12px] border p-5"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-20" />
          </li>
        ))}
      </ul>
    </div>
  )
}
