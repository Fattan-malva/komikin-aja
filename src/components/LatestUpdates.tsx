import Link from 'next/link'
import type { Komik } from '@/src/types'
import { proxyImage } from '@/src/lib/utils'
import TypeBadge from './TypeBadge'

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = Math.max(0, now - date)
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

interface Props {
  items: Komik[]
}

export default function LatestUpdates({ items }: Props) {
  if (!items.length) return null

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-white mb-4">Latest Updates</h2>
      <div className="space-y-3">
        {items.map((k) => (
          <Link
            key={k.slug}
            href={`/komik/${k.slug}`}
            className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] transition-colors group"
          >
            <div className="relative w-14 h-20 flex-shrink-0 overflow-hidden rounded-lg bg-white/5">
              <img
                src={proxyImage(k.thumbnail)}
                alt={k.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <TypeBadge type={k.type} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-100 line-clamp-1 group-hover:text-[#a855f7] transition-colors">
                {k.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                {k.latestChapter && (
                  <span className="text-xs text-gray-400">
                    Ch. {k.latestChapter.replace('chapter-', '').split('.').slice(0, -1).join('.')}
                  </span>
                )}
                {k.rating && (
                  <span className="text-xs text-yellow-400 flex items-center gap-0.5">
                    <svg className="w-3 h-3 fill-yellow-400" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {k.rating}
                  </span>
                )}
                {k.status && (
                  <span className="text-xs text-gray-500">{k.status}</span>
                )}
              </div>
            </div>
            {k.date && (
              <span className="text-xs text-gray-500 flex-shrink-0">{timeAgo(k.date)}</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}
