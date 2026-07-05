'use client'

import { useEffect, useState, useRef } from 'react'
import type { Komik } from '@/src/types'
import KomikCard from './KomikCard'

interface Props {
  komik: Komik[]
}

export default function KomikGrid({ komik }: Props) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    const needThumbs = komik.filter((k) => !k.thumbnail || k.thumbnail.length === 0)
    if (needThumbs.length === 0) return
    fetchedRef.current = true

    const slugs = needThumbs.map((k) => k.slug)
    fetch('/api/komik/thumbnails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slugs }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.thumbnails) setThumbs(data.thumbnails)
      })
      .catch(() => {})
  }, [komik])

  const enriched = komik.map((k) => {
    if ((!k.thumbnail || k.thumbnail.length === 0) && thumbs[k.slug]) {
      return { ...k, thumbnail: thumbs[k.slug] }
    }
    return k
  })

  if (enriched.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg">Tidak ada komik ditemukan</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {enriched.map((k) => (
        <KomikCard key={k.slug} komik={k} />
      ))}
    </div>
  )
}
