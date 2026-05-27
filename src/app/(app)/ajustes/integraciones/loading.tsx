import { Skeleton } from '@/components/ui/skeleton'

export default function IntegracionesLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Skeleton className="h-7 w-44 sm:h-8" />
        <Skeleton className="h-3 w-72" />
      </header>

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <li
            key={i}
            className="border-border-default bg-surface flex flex-col gap-4 rounded-[12px] border p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 w-24 rounded-[8px]" />
              <Skeleton className="h-8 w-20 rounded-[8px]" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
