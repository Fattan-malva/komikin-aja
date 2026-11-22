import { NextRequest } from 'next/server'
import { searchKomik } from '@/src/lib/scraper'
import { searchKomikH } from '@/src/lib/scrapper-h'
import { getFilteredList } from '@/src/lib/list-filter'
import { MODE_COOKIE, isHMode } from '@/src/lib/mode'
import type { SearchFilters } from '@/src/types'

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const query = sp.get('q') || ''
  const page = Number(sp.get('page')) || 1

  const filters: SearchFilters = {}
  for (const key of ['genre', 'type', 'status', 'author', 'artist', 'exclude', 'project', 'order', 'orderby'] as const) {
    const val = sp.get(key)
    if (val) (filters as Record<string, string>)[key] = val
  }
  if (!query && Object.keys(filters).length === 0) {
    return Response.json({ error: 'Query atau filter diperlukan' }, { status: 400 })
  }

  try {
    const hMode = isHMode(request.cookies.get(MODE_COOKIE)?.value)
    if (!query) return Response.json(await getFilteredList(hMode, filters, page))

    let komik: Awaited<ReturnType<typeof searchKomik>>['komik'] = []
    if (hMode) {
      const res = await searchKomikH(query, page)
      const wantType = filters.type?.toLowerCase()
      komik = wantType
        ? res.komik.filter(k => (k.type ?? '').toLowerCase() === wantType)
        : res.komik
    } else {
      komik = (await searchKomik(query, page, filters)).komik
      if (komik.length === 0) {
        komik = (await searchKomikH(query, page)).komik
      }
    }
    return Response.json({ komik })
  } catch {
    return Response.json({ error: 'Gagal mencari' }, { status: 500 })
  }
}
