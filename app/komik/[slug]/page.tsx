import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { getDetail } from '@/src/lib/scraper'
import { getDetailH } from '@/src/lib/scrapper-h'
import { proxyImage, isHSlug, stripHPrefix, slugify } from '@/src/lib/utils'
import GenreBadge from '@/src/components/GenreBadge'
import ChapterList from '@/src/components/ChapterList'
import BookmarkButton from '@/src/components/BookmarkButton'
import HistoryTracker from '@/src/components/HistoryTracker'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function KomikDetail({ params }: Props) {
  await connection()
  const { slug } = await params
  const fromH = isHSlug(slug)
  const komik = await (fromH ? getDetailH(stripHPrefix(slug)) : getDetail(slug))

  if (!komik) notFound()

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 shrink-0">
          <img
            src={proxyImage(komik.thumbnail)}
            alt={komik.title}
            className="w-full rounded-lg shadow-lg"
          />
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white">{komik.title}</h1>
            <BookmarkButton komik={{ slug: slug, title: komik.title, thumbnail: komik.thumbnail }} />
          </div>

          <HistoryTracker komik={{ slug: slug, title: komik.title, thumbnail: komik.thumbnail }} />

          {komik.synopsis && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">Sinopsis</h3>
              <p className="text-sm text-gray-300 leading-relaxed">{komik.synopsis}</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {komik.type && (
              <div>
                <span className="text-gray-500">Type</span>
                <p className="text-white font-medium">{komik.type}</p>
              </div>
            )}
            {komik.status && (
              <div>
                <span className="text-gray-500">Status</span>
                <p className="text-white font-medium">{komik.status}</p>
              </div>
            )}
            {komik.rating && (
              <div>
                <span className="text-gray-500">Rating</span>
                <p className="text-white font-medium">{komik.rating}</p>
              </div>
            )}
          </div>

          {komik.genres && komik.genres.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Genres</h3>
              <div className="flex flex-wrap gap-2">
                {komik.genres.map(g => (
                  <GenreBadge key={g} name={g} slug={slugify(g)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-4">
          Chapters ({komik.chapters?.length || 0})
        </h2>
        <ChapterList slug={slug} />
      </div>
    </div>
  )
}
