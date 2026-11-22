import { connection } from 'next/server'
import { cookies } from 'next/headers'
import { searchKomik } from '@/src/lib/scraper'
import { searchKomikH } from '@/src/lib/scrapper-h'
import { computeRelevance } from '@/src/lib/utils'
import { getFilteredList } from '@/src/lib/list-filter'
import { MODE_COOKIE, isHMode } from '@/src/lib/mode'
import KomikGrid from '@/src/components/KomikGrid'
import SearchBar from '@/src/components/SearchBar'
import SearchFilters from '@/src/components/SearchFilters'
import Pagination from '@/src/components/Pagination'
import type { SearchFilters as SearchFiltersType } from '@/src/types'

interface Props {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function SearchPage({ searchParams }: Props) {
  await connection()
  const sp = await searchParams
  const query = sp.q || ''
  const page = Number(sp.page) || 1
  const hMode = isHMode((await cookies()).get(MODE_COOKIE)?.value)

  const filters: SearchFiltersType = {}
  for (const key of ['genre', 'type', 'status', 'author', 'artist', 'exclude', 'project', 'order', 'orderby'] as const) {
    if (sp[key]) (filters as Record<string, string>)[key] = sp[key]!
  }
  const hasFilters = Object.keys(filters).length > 0

  let results: Awaited<ReturnType<typeof searchKomik>>['komik'] = []
  let moreLike: Awaited<ReturnType<typeof searchKomik>>['komik'] = []
  let totalPages = 1

  if (query) {
    if (hMode) {
      // Mode H: jangan pernah ikutkan hasil dari sumber komik biasa.
      const res = await searchKomikH(query, page)
      const wantType = filters.type?.toLowerCase()
      results = wantType
        ? res.komik.filter(k => (k.type ?? '').toLowerCase() === wantType)
        : res.komik
      if (res.totalPages) totalPages = res.totalPages
    } else {
      const [regular, h] = await Promise.allSettled([
        searchKomik(query, page, filters),
        searchKomikH(query, page),
      ])

      if (regular.status === 'fulfilled') {
        results = regular.value.komik
        if (regular.value.totalPages) totalPages = regular.value.totalPages
      }

      if (results.length === 0 && h.status === 'fulfilled') {
        results = h.value.komik
      }

      // More Like: dari sumber H, deduplikasi terhadap hasil utama.
      const resultSlugs = new Set(results.map(k => k.slug))
      if (h.status === 'fulfilled') {
        for (const k of h.value.komik) {
          if (!resultSlugs.has(k.slug)) {
            moreLike.push(k)
            resultSlugs.add(k.slug)
          }
        }
      }

      moreLike.sort((a, b) => {
        const relA = computeRelevance(a.title, query)
        const relB = computeRelevance(b.title, query)
        if (relA !== relB) return relB - relA
        return parseFloat(b.rating || '0') - parseFloat(a.rating || '0')
      })
    }
  } else if (hasFilters) {
    try {
      const res = await getFilteredList(hMode, filters, page)
      results = res.komik
      if (res.totalPages) totalPages = res.totalPages
    } catch {
      // hasil tetap kosong
    }
  }

  const showResults = results.length > 0
  const showMoreLike = moreLike.length > 0

  return (
    <div className="space-y-8">
      <div className="max-w-md mx-auto">
        <SearchBar initialQuery={query} />
      </div>
      <SearchFilters filters={filters} query={query} />
      {showResults && (query || hasFilters) && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              {query ? <>Results for <span className="text-[#22c55e]">{query}</span></> : 'Filter Results'}
            </h2>
            <span className="text-sm text-gray-400">{results.length} found</span>
          </div>
          <KomikGrid komik={results} />
          <Pagination currentPage={page} totalPages={totalPages} />
        </section>
      )}
      {showMoreLike && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4">More Like This</h2>
          <KomikGrid komik={moreLike} />
        </section>
      )}
      {!showResults && !showMoreLike && (
        <div className="text-center py-16">
          <p className="text-gray-400">
            {query
              ? <>Tidak ada hasil untuk &ldquo;{query}&rdquo;</>
              : hasFilters
                ? 'Tidak ada hasil untuk filter ini'
                : 'Cari komik favoritmu'}
          </p>
        </div>
      )}
    </div>
  )
}