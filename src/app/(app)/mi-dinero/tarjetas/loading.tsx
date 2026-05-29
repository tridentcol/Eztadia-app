import { Skeleton } from '@/components/ui/skeleton'

export default function TarjetasLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-10 lg:gap-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <Skeleton className="bg-surface-hover h-4 w-40" />
          <Skeleton className="bg-surface-hover h-10 w-64" />
          <Skeleton className="bg-surface-hover h-3 w-32" />
        </div>
        <Skeleton className="bg-surface-hover h-9 w-32 rounded-[8px]" />
      </header>

      <div className="border-border-default grid grid-cols-1 gap-0 overflow-hidden rounded-[12px] border sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="border-border-default flex flex-col gap-2 border-b p-5 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
          >
            <Skeleton className="bg-surface-hover h-3 w-24" />
            <Skeleton className="bg-surface-hover h-6 w-32" />
            <Skeleton className="bg-surface-hover h-3 w-20" />
          </div>
        ))}
      </div>

      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <li key={i}>
            <div className="border-border-default bg-surface flex flex-col gap-5 rounded-[12px] border p-5">
              <Skeleton className="bg-surface-hover aspect-[1.585/1] w-full rounded-[12px]" />
              <Skeleton className="bg-surface-hover h-4 w-32" />
              <Skeleton className="bg-surface-hover h-8 w-40" />
              <Skeleton className="bg-surface-hover h-1 w-full" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
