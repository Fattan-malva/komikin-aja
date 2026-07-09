import { NextRequest } from 'next/server'

const IMAGE_TYPES = ['image/', 'application/octet-stream']

const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#1a1a2e"/>
  <rect x="300" y="200" width="200" height="200" rx="100" fill="#2d2d4e"/>
  <circle cx="400" cy="280" r="12" fill="#a855f7" opacity="0.5"/>
  <path d="M370 320 Q400 290 430 320" stroke="#a855f7" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.5"/>
  <text x="400" y="370" text-anchor="middle" fill="#6b7280" font-size="16" font-family="sans-serif">Gambar tidak tersedia</text>
</svg>`

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) {
    return new Response('Missing url parameter', { status: 400 })
  }

  try {
    const origin = new URL(url).origin
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': `${origin}/`,
      },
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return new Response(PLACEHOLDER_SVG, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        },
      })
    }

    const contentType = response.headers.get('content-type') || ''

    if (!IMAGE_TYPES.some(t => contentType.startsWith(t))) {
      return new Response(PLACEHOLDER_SVG, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        },
      })
    }

    const buffer = await response.arrayBuffer()

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    })
  } catch {
    return new Response(PLACEHOLDER_SVG, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    })
  }
}
