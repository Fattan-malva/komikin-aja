import { connection } from 'next/server'
import { getGenre } from '@/src/lib/scraper'
import KomikGrid from '@/src/components/KomikGrid'

interface Props {
  params: Promise<{ genre: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function GenrePage({ params, searchParams }: Props) {
  await connection()
  const { genre } = await params
  const { page } = await searchParams
  let data: Awaited<ReturnType<typeof getGenre>> = { komik: [] }

  try {
    data = await getGenre(genre, Number(page) || 1)
  } catch {
    // data stays as default empty
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6 capitalize">Genre: {genre.replace(/-/g, ' ')}</h1>
      {data.komik.length > 0 ? (
        <KomikGrid komik={data.komik} />
      ) : (
        <p className="text-gray-400">Tidak ada komik ditemukan untuk genre ini.</p>
      )}
    </div>
  )
}
