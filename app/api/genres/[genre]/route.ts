import { NextRequest } from 'next/server'
import { getGenre } from '@/src/lib/scraper'
import { getGenreH } from '@/src/lib/scrapper-h'
import { MODE_COOKIE, isHMode } from '@/src/lib/mode'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ genre: string }> }
) {
  const { genre } = await params
  const page = Number(request.nextUrl.searchParams.get('page')) || 1
  const hMode = isHMode(request.cookies.get(MODE_COOKIE)?.value)
  try {
    const data = await (hMode ? getGenreH(genre, page) : getGenre(genre, page))
    return Response.json(data)
  } catch {
    return Response.json({ error: 'Gagal mengambil data genre' }, { status: 500 })
  }
}
