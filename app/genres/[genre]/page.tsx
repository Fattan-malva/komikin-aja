import { getGenre } from '@/src/lib/scraper'
import KomikGrid from '@/src/components/KomikGrid'

interface Props {
  params: Promise<{ genre: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function GenrePage({ params, searchParams }: Props) {
  const { genre } = await params
  const { page } = await searchParams
  const data = await getGenre(genre, Number(page) || 1)

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6 capitalize">Genre: {genre.replace(/-/g, ' ')}</h1>
      <KomikGrid komik={data.komik} />
    </div>
  )
}
