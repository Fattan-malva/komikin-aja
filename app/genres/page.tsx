import { connection } from 'next/server'
import { cookies } from 'next/headers'
import { getGenreList } from '@/src/lib/scraper'
import { getGenreListH } from '@/src/lib/scrapper-h'
import { MODE_COOKIE, isHMode } from '@/src/lib/mode'
import GenreBadge from '@/src/components/GenreBadge'

export default async function GenresPage() {
  await connection()
  const hMode = isHMode((await cookies()).get(MODE_COOKIE)?.value)
  const genres = hMode ? await getGenreListH() : await getGenreList()

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Genres</h1>
      {genres.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {genres.map(g => (
            <GenreBadge key={g.slug} name={g.name} slug={g.slug} />
          ))}
        </div>
      ) : (
        <p className="text-gray-400">Gagal memuat genre. Coba lagi nanti.</p>
      )}
    </div>
  )
}
