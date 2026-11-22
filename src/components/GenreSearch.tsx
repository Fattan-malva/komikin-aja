'use client'

import { useState } from 'react'
import type { Genre } from '@/src/types'
import GenreBadge from './GenreBadge'

export default function GenreSearch({ genres }: { genres: Genre[] }) {
  const [query, setQuery] = useState('')
  const term = query.trim().toLowerCase()
  const filtered = term
    ? genres.filter(g => g.name.toLowerCase().includes(term))
    : genres

  return (
    <div className="space-y-6">
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Cari genre..."
        className="w-full max-w-md bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent transition-all"
      />
      {filtered.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {filtered.map(g => (
            <GenreBadge key={g.slug} name={g.name} slug={g.slug} />
          ))}
        </div>
      ) : (
        <p className="text-gray-400">Genre tidak ditemukan.</p>
      )}
    </div>
  )
}
