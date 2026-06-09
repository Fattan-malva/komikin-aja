'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  currentPage: number
  totalPages: number
}

export default function Pagination({ currentPage, totalPages }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(page))
    router.push(`?${params.toString()}`)
  }

  if (totalPages <= 1) return null

  const pages: number[] = []
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, currentPage + 2)
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage <= 1}
        className="px-3 py-1.5 text-sm rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
      >
        Prev
      </button>
      {start > 1 && (
        <>
          <button onClick={() => goToPage(1)} className="px-3 py-1.5 text-sm rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">1</button>
          {start > 2 && <span className="text-gray-500 px-1">...</span>}
        </>
      )}
      {pages.map(p => (
        <button
          key={p}
          onClick={() => goToPage(p)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            p === currentPage
              ? 'bg-[#a855f7] text-white'
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="text-gray-500 px-1">...</span>}
          <button onClick={() => goToPage(totalPages)} className="px-3 py-1.5 text-sm rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">{totalPages}</button>
        </>
      )}
      <button
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="px-3 py-1.5 text-sm rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
      >
        Next
      </button>
    </div>
  )
}
