import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { getChapterImages } from '@/src/lib/scraper'
import { getChapterImagesH } from '@/src/lib/scrapper-h'
import { isHSlug, stripHPrefix } from '@/src/lib/utils'
import Reader from '@/src/components/Reader'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string; chapterId: string }>
}

export default async function BacaPage({ params }: Props) {
  await connection()
  const { slug, chapterId } = await params
  const fromH = isHSlug(slug)
  const data = await (fromH ? getChapterImagesH(stripHPrefix(slug), chapterId) : getChapterImages(slug, chapterId))

  if (!data) notFound()

  return (
    <div className="-mx-4 md:mx-0">
      <Reader slug={slug} chapterId={chapterId} data={data} />
    </div>
  )
}
