import Link from 'next/link'

interface Props {
  name: string
  slug?: string
}

export default function GenreBadge({ name, slug }: Props) {
  const content = (
    <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-[#a855f7]/10 text-[#a855f7] border border-[#a855f7]/20 hover:bg-[#a855f7]/20 transition-colors">
      {name}
    </span>
  )

  if (slug) {
    return <Link href={`/genres/${slug}`}>{content}</Link>
  }
  return content
}
