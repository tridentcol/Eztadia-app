import { Skeleton } from '@/components/ui/skeleton'

export default function AlertasLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-7 w-28 sm:h-8" />
        <Skeleton className="h-9 w-36 rounded-[8px]" />
      </header>

      <ul className="border-border-default bg-surface flex flex-col rounded-[12px] border">
        {Array.from({ length: 5 }).map((_, i) => (
          <li
            key={i}
            className={`flex items-start justify-between gap-4 px-5 py-3.5 ${
              i !== 4 ? 'border-border-default/60 border-b' : ''
            }`}
          >
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-56" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="size-4" />
          </li>
        ))}
      </ul>
    </div>
  )
}
