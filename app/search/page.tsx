import { connection } from 'next/server'
import { searchKomik } from '@/src/lib/scraper'
import { searchKomikH } from '@/src/lib/scrapper-h'
import { computeRelevance } from '@/src/lib/utils'
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

  const filters: SearchFiltersType = {}
  for (const key of ['genre', 'type', 'status', 'author', 'artist', 'exclude', 'project', 'order', 'orderby'] as const) {
    if (sp[key]) (filters as Record<string, string>)[key] = sp[key]!
  }

  let results: Awaited<ReturnType<typeof searchKomik>>['komik'] = []
  let moreLike: Awaited<ReturnType<typeof searchKomik>>['komik'] = []
  let totalPages = 1

  if (query) {
    const isHOnly = query.startsWith('h-')
    const searchQuery = isHOnly ? query.slice(2) : query

    const [regular, h] = await Promise.allSettled([
      searchKomik(searchQuery, page, isHOnly ? undefined : filters),
      searchKomikH(searchQuery, page),
    ])

    if (!isHOnly && regular.status === 'fulfilled') {
      results = regular.value.komik
      if (regular.value.totalPages) totalPages = regular.value.totalPages
    }

    if (isHOnly && h.status === 'fulfilled') {
      results = h.value.komik
    }

    // If regular search is empty but H has results, show H results
    if (!isHOnly && results.length === 0 && h.status === 'fulfilled') {
      results = h.value.komik
    }

    // More Like: from the opposite source, deduplicated
    const resultSlugs = new Set(results.map(k => k.slug))
    const moreSource = isHOnly ? regular : h

    if (moreSource.status === 'fulfilled' && moreSource.value.komik.length > 0) {
      for (const k of moreSource.value.komik) {
        if (!resultSlugs.has(k.slug)) {
          moreLike.push(k)
          resultSlugs.add(k.slug)
        }
      }
    }

    moreLike.sort((a, b) => {
      const relA = computeRelevance(a.title, searchQuery)
      const relB = computeRelevance(b.title, searchQuery)
      if (relA !== relB) return relB - relA
      return parseFloat(b.rating || '0') - parseFloat(a.rating || '0')
    })
  }

  const showResults = results.length > 0
  const showMoreLike = moreLike.length > 0

  return (
    <div className="space-y-8">
      <div className="max-w-md mx-auto">
        <SearchBar initialQuery={query} />
      </div>
      <SearchFilters filters={filters} query={query} />
      {query && showResults && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              Results for <span className="text-[#a855f7]">{query}</span>
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
      {query && !showResults && !showMoreLike && (
        <div className="text-center py-16">
          <p className="text-gray-400">Tidak ada hasil untuk &ldquo;{query}&rdquo;</p>
        </div>
      )}
      {!query && !showResults && !showMoreLike && (
        <div className="text-center py-16">
          <p className="text-gray-400">Cari komik favoritmu</p>
        </div>
      )}
    </div>
  )
}