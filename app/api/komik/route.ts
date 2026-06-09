import { NextRequest } from 'next/server'
import { getHome } from '@/src/lib/scraper'

export async function GET(request: NextRequest) {
  const page = Number(request.nextUrl.searchParams.get('page')) || 1
  try {
    const data = await getHome(page)
    return Response.json(data)
  } catch {
    return Response.json({ error: 'Gagal mengambil data' }, { status: 500 })
  }
}
