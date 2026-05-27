import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-10 lg:gap-12">
      <header className="flex flex-col gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-12 w-56 sm:h-14 lg:h-16 lg:w-72" />
        <Skeleton className="h-3 w-40" />
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="border-border-default bg-surface flex flex-col gap-2 rounded-[12px] border p-4"
            >
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-24" />
            </li>
          ))}
        </ul>
      </section>

      <Skeleton className="h-28 w-full rounded-[12px]" />
      <Skeleton className="h-44 w-full rounded-[12px]" />

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
        <ul className="border-border-default bg-surface flex flex-col rounded-[12px] border">
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={i}
              className={`flex items-center justify-between gap-4 px-5 py-3 ${
                i !== 4 ? 'border-border-default/60 border-b' : ''
              }`}
            >
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-20" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
