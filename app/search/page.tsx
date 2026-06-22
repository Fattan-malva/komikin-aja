import { connection } from 'next/server'
import { searchKomik } from '@/src/lib/scraper'
import { searchKomikH } from '@/src/lib/scrapper-h'
import KomikGrid from '@/src/components/KomikGrid'
import SearchBar from '@/src/components/SearchBar'
import Pagination from '@/src/components/Pagination'

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>
}

export default async function SearchPage({ searchParams }: Props) {
  await connection()
  const { q, page: pageStr } = await searchParams
  const query = q || ''
  const page = Number(pageStr) || 1

  let allKomik: Awaited<ReturnType<typeof searchKomik>>['komik'] = []
  let totalPages = 1

  if (query) {
    if (query.startsWith('h-')) {
      const res = await searchKomikH(query.slice(2), page)
      allKomik = res.komik
      if (res.totalPages) totalPages = res.totalPages
    } else {
      const res = await searchKomik(query, page)
      allKomik = res.komik
      if (res.totalPages) totalPages = res.totalPages
    }
  }

  return (
    <div className="space-y-6">
      <div className="max-w-md mx-auto">
        <SearchBar />
      </div>
      {query && (
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">
            Search: <span className="text-[#a855f7]">{query}</span>
          </h1>
          <span className="text-sm text-gray-400">{allKomik.length} results</span>
        </div>
      )}
      {allKomik.length > 0 ? (
        <>
          <KomikGrid komik={allKomik} />
          <Pagination currentPage={page} totalPages={totalPages} />
        </>
      ) : query ? (
        <div className="text-center py-16">
          <p className="text-gray-400">Tidak ada hasil untuk &ldquo;{query}&rdquo;</p>
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-400">Cari komik favoritmu</p>
        </div>
      )}
    </div>
  )
}