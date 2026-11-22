'use client'

import { useState } from 'react'
import type { Komik } from '@/src/types'
import { filterKomik } from '@/src/lib/utils'
import KomikGrid from './KomikGrid'

const OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'manhwa', label: 'Manhwa (Korea)' },
  { value: 'manga', label: 'Manga (Jepang)' },
  { value: 'manhua', label: 'Manhua (China)' },
]

export default function GenreTypeFilter({ komik }: { komik: Komik[] }) {
  const [type, setType] = useState('')
  const shown = type ? filterKomik(komik, { type }) : komik

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="w-full max-w-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
        >
          {OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <KomikGrid komik={shown} />
    </div>
  )
}
