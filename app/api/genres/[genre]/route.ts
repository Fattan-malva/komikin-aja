import { NextRequest } from 'next/server'
import { getGenre } from '@/src/lib/scraper'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ genre: string }> }
) {
  const { genre } = await params
  const page = Number(request.nextUrl.searchParams.get('page')) || 1
  try {
    const data = await getGenre(genre, page)
    return Response.json(data)
  } catch {
    return Response.json({ error: 'Gagal mengambil data genre' }, { status: 500 })
  }
}
