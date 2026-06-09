import { getGenreList } from '@/src/lib/scraper'
import GenreBadge from '@/src/components/GenreBadge'

export default async function GenresPage() {
  const genres = await getGenreList()

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Genres</h1>
      <div className="flex flex-wrap gap-3">
        {genres.map(g => (
          <GenreBadge key={g.slug} name={g.name} slug={g.slug} />
        ))}
      </div>
    </div>
  )
}
