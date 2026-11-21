import { connection } from 'next/server'
import { cookies } from 'next/headers'
import { getGenre } from '@/src/lib/scraper'
import { getGenreH } from '@/src/lib/scrapper-h'
import { MODE_COOKIE, isHMode } from '@/src/lib/mode'
import KomikGrid from '@/src/components/KomikGrid'
import Pagination from '@/src/components/Pagination'
import type { KomikListResponse } from '@/src/types'

interface Props {
  params: Promise<{ genre: string }>
  searchParams: Promise<{ page?: string; source?: string }>
}

export default async function GenrePage({ params, searchParams }: Props) {
  await connection()
  const { genre } = await params
  const { page, source } = await searchParams
  const pageNum = Number(page) || 1
  const hMode = isHMode((await cookies()).get(MODE_COOKIE)?.value)

  const data: KomikListResponse = { komik: [] }

  if (hMode || source === 'h') {
    try {
      const result = await getGenreH(genre, pageNum)
      Object.assign(data, result)
    } catch {
      // data stays as default empty
    }
  } else {
    try {
      const result = await getGenre(genre, pageNum)
      Object.assign(data, result)
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
