import Link from 'next/link'
import { proxyImage } from '@/src/lib/utils'
import TypeBadge from './TypeBadge'
import type { Komik } from '@/src/types'

interface Props {
  komik: Komik
}

function ThumbnailPlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-white/5">
      <svg className="w-12 h-12 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    </div>
  )
}

export default function KomikCard({ komik }: Props) {
  const hasThumb = komik.thumbnail && komik.thumbnail.length > 0
  return (
    <div className="group">
      <Link href={`/komik/${komik.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-white/5 mb-2">
          {hasThumb ? (
            <img
              src={proxyImage(komik.thumbnail)}
              alt={komik.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <ThumbnailPlaceholder />
          )}
          <TypeBadge type={komik.type} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <h3 className="text-sm font-semibold text-gray-100 line-clamp-2 leading-tight group-hover:text-[#a855f7] transition-colors">
          {komik.title}
        </h3>
      </Link>
      {komik.rating && (
        <div className="flex items-center gap-1 mt-1">
          <svg className="w-3 h-3 text-yellow-400 fill-yellow-400" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span className="text-xs text-gray-400">{komik.rating}</span>
          {komik.status && (
            <>
              <span className="text-xs text-gray-600">•</span>
              <span className="text-xs text-gray-400">{komik.status}</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
