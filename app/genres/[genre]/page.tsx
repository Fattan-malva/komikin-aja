import { connection } from 'next/server'
import { getGenre } from '@/src/lib/scraper'
import { getGenreH } from '@/src/lib/scrapper-h'
import KomikGrid from '@/src/components/KomikGrid'
import Pagination from '@/src/components/Pagination'

interface Props {
  params: Promise<{ genre: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function GenrePage({ params, searchParams }: Props) {
  await connection()
  const { genre } = await params
  const pageNum = Number((await searchParams).page) || 1
  let data: Awaited<ReturnType<typeof getGenre>> = { komik: [] }

  try {
    data = await getGenre(genre, pageNum)
  } catch {
    // data stays as default empty
  }

  if (data.komik.length === 0) {
    try {
      data = await getGenreH(genre, pageNum)
    } catch {
      // data stays as default empty
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6 capitalize">Genre: {genre.replace(/-/g, ' ')}</h1>
      {data.komik.length > 0 ? (
        <>
          <KomikGrid komik={data.komik} />
          {data.totalPages && data.totalPages > 1 && (
            <Pagination currentPage={data.currentPage || pageNum} totalPages={data.totalPages} />
          )}
        </>
      ) : (
        <p className="text-gray-400">Tidak ada komik ditemukan untuk genre ini.</p>
      )}
    </div>
  )
}
