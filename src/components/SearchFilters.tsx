'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, FormEvent } from 'react'
import type { SearchFilters as SearchFiltersType, Genre } from '@/src/types'

interface Props {
  filters: SearchFiltersType
  query: string
}

const TYPE_OPTIONS = ['', 'Manga', 'Manhwa', 'Manhua', 'Manhwa Manhua']
const STATUS_OPTIONS = ['', 'Ongoing', 'Completed']
const ORDERBY_OPTIONS = [
  { value: 'popular', label: 'Popular' },
  { value: 'rating', label: 'Rating' },
  { value: 'updated', label: 'Updated' },
  { value: 'bookmarked', label: 'Bookmarked' },
  { value: 'title', label: 'Title' },
]

export default function SearchFilters({ filters, query }: Props) {
  const router = useRouter()
  const [genres, setGenres] = useState<Genre[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [local, setLocal] = useState({ ...filters })

  useEffect(() => {
    fetch('/api/genres')
      .then(r => r.json())
      .then(setGenres)
      .catch(() => {})
  }, [])

  function apply(e: FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (local.genre) params.set('genre', local.genre)
    if (local.type) params.set('type', local.type)
    if (local.status) params.set('status', local.status)
    if (local.author) params.set('author', local.author)
    if (local.artist) params.set('artist', local.artist)
    if (local.orderby) params.set('orderby', local.orderby)
    if (local.order) params.set('order', local.order)
    router.push(`/search?${params.toString()}`)
  }

  function resetAll() {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    router.push(`/search?${params.toString()}`)
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
      <button
        type="button"
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
      >
        <svg className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        Advanced Filters
      </button>

      {showFilters && (
        <form onSubmit={apply} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Genre</label>
              <select
                value={local.genre || ''}
                onChange={e => setLocal({ ...local, genre: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white"
              >
                <option value="">All Genres</option>
                {genres.map(g => (
                  <option key={g.slug} value={g.slug}>{g.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Type</label>
              <select
                value={local.type || ''}
                onChange={e => setLocal({ ...local, type: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white"
              >
                {TYPE_OPTIONS.map(t => (
                  <option key={t} value={t}>{t || 'All Types'}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Status</label>
              <select
                value={local.status || ''}
                onChange={e => setLocal({ ...local, status: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white"
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s || 'All Status'}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Sort By</label>
              <select
                value={local.orderby || 'popular'}
                onChange={e => setLocal({ ...local, orderby: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white"
              >
                {ORDERBY_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Order</label>
              <select
                value={local.order || 'desc'}
                onChange={e => setLocal({ ...local, order: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Author</label>
              <input
                type="text"
                value={local.author || ''}
                onChange={e => setLocal({ ...local, author: e.target.value })}
                placeholder="Author name..."
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Artist</label>
              <input
                type="text"
                value={local.artist || ''}
                onChange={e => setLocal({ ...local, artist: e.target.value })}
                placeholder="Artist name..."
                className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-1.5 text-sm font-medium bg-[#a855f7] text-white rounded hover:bg-[#9333ea] transition-colors"
            >
              Apply Filters
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="px-4 py-1.5 text-sm text-gray-400 hover:text-white border border-white/10 rounded transition-colors"
            >
              Reset
            </button>
          </div>
        </form>
      )}
    </div>
  )
}