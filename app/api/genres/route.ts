import { NextRequest } from 'next/server'
import { getGenreList } from '@/src/lib/scraper'
import { getGenreListH } from '@/src/lib/scrapper-h'
import { MODE_COOKIE, isHMode } from '@/src/lib/mode'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const hMode = isHMode(request.cookies.get(MODE_COOKIE)?.value)
  try {
    const data = await (hMode ? getGenreListH() : getGenreList())
    return Response.json(data)
  } catch {
    return Response.json({ error: 'Gagal mengambil genre' }, { status: 500 })
  }
}
