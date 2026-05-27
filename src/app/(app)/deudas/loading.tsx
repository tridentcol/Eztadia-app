import { Skeleton } from '@/components/ui/skeleton'

export default function DeudasLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-10">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-48 sm:h-12 lg:h-14" />
          </div>
          <Skeleton className="h-9 w-36 rounded-[8px]" />
        </div>
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-32" />
        </div>
      </header>

      <Skeleton className="h-20 w-full rounded-[12px]" />

      <section className="flex flex-col gap-4">
        <Skeleton className="h-4 w-40" />
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <li
              key={i}
              className="border-border-default bg-surface flex flex-col gap-3 rounded-[12px] border p-5"
            >
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-3 w-28" />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <Skeleton className="h-4 w-44" />
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <li
              key={i}
              className="border-border-default bg-surface flex flex-col gap-3 rounded-[12px] border p-5"
            >
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-8 w-44" />
              <div className="flex flex-wrap gap-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
