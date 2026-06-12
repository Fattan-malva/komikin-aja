import { NextRequest } from 'next/server'
import { searchKomik } from '@/src/lib/scraper'
import { searchKomikH } from '@/src/lib/scrapper-h'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') || ''
  const page = Number(request.nextUrl.searchParams.get('page')) || 1
  if (!query) {
    return Response.json({ error: 'Query diperlukan' }, { status: 400 })
  }
  try {
    let komik: Awaited<ReturnType<typeof searchKomik>>['komik'] = []
    if (query.startsWith('h-')) {
      const res = await searchKomikH(query.slice(2), page)
      komik = res.komik
    } else {
      const res = await searchKomik(query, page)
      komik = res.komik
    }
    return Response.json({ komik })
  } catch {
    return Response.json({ error: 'Gagal mencari' }, { status: 500 })
  }
}