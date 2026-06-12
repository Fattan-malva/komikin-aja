import { getChapterImages } from '@/src/lib/scraper'
import { getChapterImagesH } from '@/src/lib/scrapper-h'
import { isHSlug, stripHPrefix } from '@/src/lib/utils'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; chapterId: string }> }
) {
  const { slug, chapterId } = await params
  try {
    const fromH = isHSlug(slug)
    const data = await (fromH ? getChapterImagesH(stripHPrefix(slug), chapterId) : getChapterImages(slug, chapterId))
    if (!data) {
      return Response.json({ error: 'Chapter tidak ditemukan' }, { status: 404 })
    }
    return Response.json(data)
  } catch {
    return Response.json({ error: 'Gagal mengambil chapter' }, { status: 500 })
  }
}
