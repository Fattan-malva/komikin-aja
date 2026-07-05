import { NextRequest } from 'next/server'
import { searchKomik } from '@/src/lib/scraper'
import { searchKomikH } from '@/src/lib/scrapper-h'
import type { SearchFilters } from '@/src/types'

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const query = sp.get('q') || ''
  const page = Number(sp.get('page')) || 1
  if (!query) {
    return Response.json({ error: 'Query diperlukan' }, { status: 400 })
  }
  try {
    let komik: Awaited<ReturnType<typeof searchKomik>>['komik'] = []
    const isHOnly = query.startsWith('h-')
    const searchQuery = isHOnly ? query.slice(2) : query
    if (isHOnly) {
      const res = await searchKomikH(searchQuery, page)
      komik = res.komik
    } else {
      const filters: SearchFilters = {}
      for (const key of ['genre', 'type', 'status', 'author', 'artist', 'exclude', 'project', 'order', 'orderby'] as const) {
        const val = sp.get(key)
        if (val) (filters as Record<string, string>)[key] = val
      }
      const res = await searchKomik(searchQuery, page, filters)
      komik = res.komik
      // If regular search is empty, also search H site
      if (komik.length === 0) {
        const hRes = await searchKomikH(searchQuery, page)
        komik = hRes.komik
      }
    }
    return Response.json({ komik })
  } catch {
    return Response.json({ error: 'Gagal mencari' }, { status: 500 })
  }
}