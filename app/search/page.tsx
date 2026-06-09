import { searchKomik } from '@/src/lib/scraper'
import KomikGrid from '@/src/components/KomikGrid'
import SearchBar from '@/src/components/SearchBar'

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, page } = await searchParams
  const query = q || ''

  let data: Awaited<ReturnType<typeof searchKomik>> = { komik: [] }
  if (query) {
    data = await searchKomik(query, Number(page) || 1)
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
          <span className="text-sm text-gray-400">{data.komik.length} results</span>
        </div>
      )}
      {data.komik.length > 0 ? (
        <KomikGrid komik={data.komik} />
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
