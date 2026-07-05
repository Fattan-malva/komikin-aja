export function getDomain(): string {
  const domain = process.env.DOMAIN_KIRYUU
  if (!domain) throw new Error('DOMAIN_KIRYUU tidak ditemukan di .env')
  return domain.replace(/\/+$/, '')
}

export function getDomainH(): string {
  return getDomainsH()[0]
}

export function getDomainsH(): string[] {
  const raw = process.env.DOMAIN_KOMIK_H || process.env['DOMAIN_KOMIK_H']
  if (!raw) throw new Error('DOMAIN_KOMIK_H tidak ditemukan di .env')
  return raw.split(',').map(d => d.trim().replace(/\/+$/, '')).filter(Boolean)
}

export function isHSlug(slug: string): boolean {
  return slug.startsWith('h-')
}

export function stripHPrefix(slug: string): string {
  return isHSlug(slug) ? slug.slice(2) : slug
}

export function extractSlug(url: string | undefined): string {
  if (!url) return ''
  const parts = url.replace(/\/+$/, '').split('/')
  return parts[parts.length - 1]
}

export function sanitizeHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim()
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[\s/]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export function proxyImage(url: string): string {
  if (url.startsWith('/api/proxy/image')) return url
  return `/api/proxy/image?url=${encodeURIComponent(url)}`
}

export function computeRelevance(title: string, query: string): number {
  const t = title.toLowerCase().trim()
  const q = query.toLowerCase().trim()
  if (!q) return 0

  if (t === q) return 100
  if (t.startsWith(q)) return 90
  if (t.includes(q)) return 80

  const queryWords = q.split(/\s+/).filter(Boolean)
  const titleWords = t.split(/\s+/).filter(Boolean)

  const matchedWords = queryWords.filter(qw =>
    titleWords.some(tw => tw.includes(qw) || qw.includes(tw))
  )

  if (matchedWords.length === queryWords.length && queryWords.length > 0) return 70
  if (matchedWords.length > 0) return 40 + matchedWords.length * 5

  for (const qw of queryWords) {
    for (const tw of titleWords) {
      if (tw.substring(0, qw.length) === qw || qw.substring(0, tw.length) === tw) return 15
    }
  }

  return 0
}
