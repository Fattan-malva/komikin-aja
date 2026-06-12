export function getDomain(): string {
  const domain = process.env.DOMAIN_KIRYUU
  if (!domain) throw new Error('DOMAIN_KIRYUU tidak ditemukan di .env')
  return domain.replace(/\/+$/, '')
}

export function getDomainH(): string {
  const domain = process.env.DOMAIN_KOMIK_H || process.env['DOMAIN_KOMIK_H']
  if (!domain) throw new Error('DOMAIN_KOMIK_H tidak ditemukan di .env')
  return domain.replace(/\/+$/, '')
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

export function proxyImage(url: string): string {
  if (url.startsWith('/api/proxy/image')) return url
  return `/api/proxy/image?url=${encodeURIComponent(url)}`
}
