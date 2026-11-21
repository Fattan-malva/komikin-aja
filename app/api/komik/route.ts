import { NextRequest } from 'next/server'
import { getHome } from '@/src/lib/scraper'
import { getHomeH } from '@/src/lib/scrapper-h'
import { MODE_COOKIE, isHMode } from '@/src/lib/mode'

export async function GET(request: NextRequest) {
  const page = Number(request.nextUrl.searchParams.get('page')) || 1
  const hMode = isHMode(request.cookies.get(MODE_COOKIE)?.value)
  try {
    const data = await (hMode ? getHomeH(page) : getHome(page))
    return Response.json(data)
  } catch {
    return Response.json({ error: 'Gagal mengambil data' }, { status: 500 })
  }
}
