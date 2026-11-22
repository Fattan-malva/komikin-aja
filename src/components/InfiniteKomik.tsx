'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Komik } from '@/src/types'
import { filterKomik } from '@/src/lib/utils'
import KomikGrid from './KomikGrid'
import LatestUpdates from './LatestUpdates'

interface Props {
  initial: Komik[]
  initialPage: number
  totalPages: number
  endpoint: string
  variant?: 'grid' | 'latest'
  typeFilter?: boolean
}

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'manhwa', label: 'Manhwa (Korea)' },
  { value: 'manga', label: 'Manga (Jepang)' },
  { value: 'manhua', label: 'Manhua (China)' },
]

export default function InfiniteKomik({ initial, initialPage, totalPages: startTotal, endpoint, variant = 'grid', typeFilter = false }: Props) {
  const [items, setItems] = useState(initial)
  const [type, setType] = useState('')
  const [page, setPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(Math.max(1, startTotal))
  const sentinel = useRef<HTMLDivElement>(null)
  const busy = useRef(false)

  const loadMore = useCallback(async () => {
    if (busy.current || page >= totalPages) return
    busy.current = true
    try {
      const sep = endpoint.includes('?') ? '&' : '?'
      const res = await fetch(`${endpoint}${sep}page=${page + 1}`)
      const data = await res.json()
      const more: Komik[] = Array.isArray(data?.komik) ? data.komik : []
      setItems(prev => {
        const seen = new Set(prev.map(k => k.slug))
        return [...prev, ...more.filter(k => !seen.has(k.slug))]
      })
      setPage(data?.currentPage || page + 1)
      setTotalPages(data?.totalPages || (more.length ? page + 2 : page + 1))
    } catch {
      // Gagal fetch tidak menampilkan apa pun; observer bisa mencoba lagi.
    } finally {
      busy.current = false
    }
  }, [endpoint, page, totalPages])

  useEffect(() => {
    const el = sentinel.current
    if (!el || page >= totalPages) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0]?.isIntersecting) void loadMore() },
      { rootMargin: '800px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, page, totalPages])

  const shown = typeFilter && type ? filterKomik(items, { type }) : items

  return (
    <div className={typeFilter ? 'space-y-6' : ''}>
      {typeFilter && (
        <div className="flex justify-center">
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="w-full max-w-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
          >
            {TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )}
      {variant === 'latest' ? <LatestUpdates items={shown} /> : <KomikGrid komik={shown} />}
      {items.length > 0 && page < totalPages && <div ref={sentinel} aria-hidden className="h-px" />}
    </div>
  )
}
