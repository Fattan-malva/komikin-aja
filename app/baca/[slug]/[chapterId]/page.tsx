import { notFound } from 'next/navigation'
import { getChapterImages } from '@/src/lib/scraper'
import Reader from '@/src/components/Reader'

interface Props {
  params: Promise<{ slug: string; chapterId: string }>
}

export default async function BacaPage({ params }: Props) {
  const { slug, chapterId } = await params
  const data = await getChapterImages(slug, chapterId)

  if (!data) notFound()

  return (
    <div className="-mx-4 md:mx-0">
      <Reader slug={slug} chapterId={chapterId} data={data} />
    </div>
  )
}
