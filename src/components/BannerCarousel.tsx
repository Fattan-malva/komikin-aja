'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { Komik } from '@/src/types'
import { getImageUrls } from '@/src/lib/utils'
import { SafeImage } from '@/src/components/SafeImage'
import TypeBadge from './TypeBadge'

interface Props {
  items: Komik[]
}

export default function BannerCarousel({ items }: Props) {
  const [current, setCurrent] = useState(0)

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % items.length)
  }, [items.length])

  useEffect(() => {
    if (items.length <= 1) return
    const id = setInterval(next, 5000)
    return () => clearInterval(id)
  }, [items.length, next])

  if (!items.length) return null

  const item = items[current]

  return (
    <div className="relative w-full h-[400px] sm:h-[500px] overflow-hidden rounded-2xl mb-10 group">
      {items.map((k, i) => (
        <div
          key={k.slug}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${i === current ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <Link href={`/komik/${k.slug}`} className="block w-full h-full">
            <SafeImage
              src={getImageUrls(k.thumbnail).direct}
              proxySrc={getImageUrls(k.thumbnail).proxy}
              alt={k.title}
              className="w-full h-full object-cover"
            />
            <TypeBadge type={k.type} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
              <h2 className="text-2xl sm:text-4xl font-bold text-white mb-3 drop-shadow-lg">
                {k.title}
              </h2>
              {k.synopsis && (
                <p className="text-sm sm:text-base text-gray-200 line-clamp-3 max-w-2xl drop-shadow-lg mb-4">
                  {k.synopsis}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                {k.genres?.slice(0, 4).map((g) => (
                  <span
                    key={g}
                    className="px-3 py-1 text-xs font-medium rounded-full bg-white/20 backdrop-blur-sm text-white"
                  >
                    {g}
                  </span>
                ))}
                {k.rating && (
                  <span className="flex items-center gap-1 text-sm text-yellow-400 font-semibold drop-shadow-lg">
                    <svg className="w-4 h-4 fill-yellow-400" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {k.rating}
                  </span>
                )}
                {k.status && (
                  <span className="text-sm text-gray-300 drop-shadow-lg">{k.status}</span>
                )}
              </div>
            </div>
          </Link>
        </div>
      ))}

      {items.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((c) => (c - 1 + items.length) % items.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button
            onClick={() => setCurrent((c) => (c + 1) % items.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${i === current ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
