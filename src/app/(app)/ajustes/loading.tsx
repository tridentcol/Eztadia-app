import { Skeleton } from '@/components/ui/skeleton'

export default function AjustesLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-10">
      <header className="flex flex-col gap-2">
        <Skeleton className="h-7 w-28 sm:h-8" />
        <Skeleton className="h-3 w-64" />
      </header>

      <ul className="border-border-default bg-surface flex flex-col rounded-[12px] border">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className={`flex min-h-[64px] items-center justify-between gap-4 px-5 py-3 ${
              i !== 5 ? 'border-border-default/60 border-b' : ''
            }`}
          >
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="size-4" />
          </li>
        ))}
      </ul>
    </div>
  )
}
