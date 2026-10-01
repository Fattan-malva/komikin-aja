import { getGenreList } from '@/src/lib/scraper'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getGenreList()
    return Response.json(data)
  } catch {
    return Response.json({ error: 'Gagal mengambil genre' }, { status: 500 })
  }
}
