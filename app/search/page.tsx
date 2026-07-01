import { connection } from 'next/server'
import { searchKomik } from '@/src/lib/scraper'
import { searchKomikH } from '@/src/lib/scrapper-h'
import { computeRelevance } from '@/src/lib/utils'
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
    const isHOnly = query.startsWith('h-')

    if (isHOnly) {
      const h = await searchKomikH(query.slice(2), page)
      allKomik = h.komik
    } else {
      const [regular, h] = await Promise.allSettled([
        searchKomik(query, page),
        searchKomikH(query, page),
      ])

      if (regular.status === 'fulfilled') {
        allKomik = regular.value.komik
        if (regular.value.totalPages) totalPages = regular.value.totalPages
      }

      if (h.status === 'fulfilled' && h.value.komik.length > 0) {
        const hSlugs = new Set(allKomik.map(k => k.slug))
        for (const k of h.value.komik) {
          if (!hSlugs.has(k.slug)) {
            allKomik.push(k)
            hSlugs.add(k.slug)
          }
        }
      }
    }

    allKomik.sort((a, b) => {
      const relA = computeRelevance(a.title, isHOnly ? query.slice(2) : query)
      const relB = computeRelevance(b.title, isHOnly ? query.slice(2) : query)
      if (relA !== relB) return relB - relA
      return parseFloat(b.rating || '0') - parseFloat(a.rating || '0')
    })
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