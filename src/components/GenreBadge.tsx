import Link from 'next/link'

interface Props {
  name: string
  slug?: string
  source?: string
}

export default function GenreBadge({ name, slug, source }: Props) {
  const content = (
    <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 hover:bg-[#22c55e]/20 transition-colors">
      {name}
    </span>
  )

  if (slug) {
    const href = source ? `/genres/${slug}?source=${source}` : `/genres/${slug}`
    return <Link href={href}>{content}</Link>
  }
  return content
}
