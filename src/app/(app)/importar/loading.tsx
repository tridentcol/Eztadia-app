import { Skeleton } from '@/components/ui/skeleton'

export default function ImportarLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Skeleton className="h-7 w-32 sm:h-8" />
        <Skeleton className="h-3 w-72" />
      </header>

      <Skeleton className="h-48 w-full rounded-[12px]" />

      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-40" />
        <ul className="border-border-default bg-surface flex flex-col rounded-[12px] border">
          {Array.from({ length: 4 }).map((_, i) => (
            <li
              key={i}
              className={`flex items-center justify-between gap-4 px-5 py-3 ${
                i !== 3 ? 'border-border-default/60 border-b' : ''
              }`}
            >
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3 w-16" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
