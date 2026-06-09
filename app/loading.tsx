import { SkeletonGrid } from '@/src/components/Skeleton'

export default function Loading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 bg-white/5 rounded w-48 animate-pulse" />
        <div className="h-4 bg-white/5 rounded w-16 animate-pulse" />
      </div>
      <SkeletonGrid count={12} />
    </div>
  )
}
