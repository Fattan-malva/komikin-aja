import { connection } from 'next/server'
import { cookies } from 'next/headers'
import { getGenreList } from '@/src/lib/scraper'
import { getGenreListH } from '@/src/lib/scrapper-h'
import { MODE_COOKIE, isHMode } from '@/src/lib/mode'
import GenreSearch from '@/src/components/GenreSearch'

export default async function GenresPage() {
  await connection()
  const hMode = isHMode((await cookies()).get(MODE_COOKIE)?.value)
  const genres = hMode ? await getGenreListH() : await getGenreList()

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Genres</h1>
      {genres.length > 0 ? (
        <GenreSearch genres={genres} />
      ) : (
        <p className="text-gray-400">Gagal memuat genre. Coba lagi nanti.</p>
      )}
    </div>
  )
}
