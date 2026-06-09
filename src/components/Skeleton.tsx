export function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-white/5 mb-2" />
      <div className="h-4 bg-white/5 rounded w-3/4 mb-1" />
      <div className="h-3 bg-white/5 rounded w-1/2" />
    </div>
  )
}

export function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonDetail() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 shrink-0">
          <div className="aspect-[3/4] rounded-lg bg-white/5" />
        </div>
        <div className="flex-1 space-y-4">
          <div className="h-8 bg-white/5 rounded w-3/4" />
          <div className="space-y-2">
            <div className="h-3 bg-white/5 rounded w-1/6" />
            <div className="h-4 bg-white/5 rounded w-full" />
            <div className="h-4 bg-white/5 rounded w-full" />
            <div className="h-4 bg-white/5 rounded w-2/3" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i}>
                <div className="h-3 bg-white/5 rounded w-12 mb-1" />
                <div className="h-4 bg-white/5 rounded w-20" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-white/5 rounded w-16" />
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-6 bg-white/5 rounded-full w-16" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div>
        <div className="h-6 bg-white/5 rounded w-40 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-10 bg-white/5 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function SkeletonReader() {
  return (
    <div className="w-full max-w-4xl mx-auto animate-pulse">
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="h-9 bg-white/5 rounded w-20" />
        <div className="h-4 bg-white/5 rounded w-28" />
        <div className="h-9 bg-white/5 rounded w-20" />
      </div>
      <div className="space-y-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-full bg-black/20">
            <div className="aspect-[3/4] bg-white/5 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
