import { getDetail } from '@/src/lib/scraper'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  try {
    const data = await getDetail(slug)
    if (!data) {
      return Response.json({ error: 'Komik tidak ditemukan' }, { status: 404 })
    }
    return Response.json(data)
  } catch {
    return Response.json({ error: 'Gagal mengambil data komik' }, { status: 500 })
  }
}
