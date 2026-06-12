import { getDetail } from '@/src/lib/scraper'
import { getDetailH } from '@/src/lib/scrapper-h'
import { isHSlug, stripHPrefix } from '@/src/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  try {
    const fromH = isHSlug(slug)
    const data = await (fromH ? getDetailH(stripHPrefix(slug)) : getDetail(slug))
    if (!data) {
      return Response.json({ error: 'Komik tidak ditemukan' }, { status: 404 })
    }
    return Response.json(data)
  } catch {
    return Response.json({ error: 'Gagal mengambil data komik' }, { status: 500 })
  }
}
