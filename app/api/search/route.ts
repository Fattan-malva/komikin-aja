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
    if (query.startsWith('h-')) {
      const res = await searchKomikH(query.slice(2), page)
      komik = res.komik
    } else {
      const filters: SearchFilters = {}
      for (const key of ['genre', 'type', 'status', 'author', 'artist', 'exclude', 'project', 'order', 'orderby'] as const) {
        const val = sp.get(key)
        if (val) (filters as Record<string, string>)[key] = val
      }
      const res = await searchKomik(query, page, filters)
      komik = res.komik
    }
    return Response.json({ komik })
  } catch {
    return Response.json({ error: 'Gagal mencari' }, { status: 500 })
  }
}