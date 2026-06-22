import Link from 'next/link'

interface Props {
  name: string
  slug?: string
  source?: string
}

export default function GenreBadge({ name, slug, source }: Props) {
  const content = (
    <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-[#a855f7]/10 text-[#a855f7] border border-[#a855f7]/20 hover:bg-[#a855f7]/20 transition-colors">
      {name}
    </span>
  )

  if (slug) {
    const href = source ? `/genres/${slug}?source=${source}` : `/genres/${slug}`
    return <Link href={href}>{content}</Link>
  }
  return content
}
