'use client'

import Link from 'next/link'
import type { Komik } from '@/src/types'
import { proxyImage } from '@/src/lib/utils'

interface Props {
  items: Komik[]
}

export default function PopularScroll({ items }: Props) {
  if (!items.length) return null

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
          Popular
        </h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
        {items.map((k) => (
          <Link
            key={k.slug}
            href={`/komik/${k.slug}`}
            className="flex-shrink-0 w-32 group"
          >
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-white/5 mb-2">
              <img
                src={proxyImage(k.thumbnail)}
                alt={k.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              {k.rating && (
                <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-black/60 rounded-md px-1.5 py-0.5 text-xs text-yellow-400 font-semibold">
                  <svg className="w-3 h-3 fill-yellow-400" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  {k.rating}
                </div>
              )}
            </div>
            <h3 className="text-sm font-semibold text-gray-100 line-clamp-2 leading-tight group-hover:text-[#a855f7] transition-colors">
              {k.title}
            </h3>
          </Link>
        ))}
      </div>
    </section>
  )
}
