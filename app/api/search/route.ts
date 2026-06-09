import { NextRequest } from 'next/server'
import { searchKomik } from '@/src/lib/scraper'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q') || ''
  const page = Number(request.nextUrl.searchParams.get('page')) || 1
  if (!query) {
    return Response.json({ error: 'Query diperlukan' }, { status: 400 })
  }
  try {
    const data = await searchKomik(query, page)
    return Response.json(data)
  } catch {
    return Response.json({ error: 'Gagal mencari' }, { status: 500 })
  }
}
