import axios from 'axios'
import * as cheerio from 'cheerio'
import { getDomain } from './utils'
import type { Komik, Chapter, ChapterDetail, KomikListResponse, Genre } from '@/src/types'

const axiosInstance = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
})

function parseKomikCards(html: string): Komik[] {
  const $ = cheerio.load(html)
  const seen = new Set<string>()
  const komik: Komik[] = []

  $('#project-list > div, #latest-list > div').each((_, el) => {
    const card = $(el)
    const link = card.find('a[color="primary"]').first()
    const href = link.attr('href') || ''
    const slug = href.split('/manga/')[1]?.replace(/\/$/, '') || ''
    if (!slug || seen.has(slug)) return
    seen.add(slug)

    const title = card.find('h1.text-\\[15px\\]').first().text().trim()
    const thumbnail = card.find('img.wp-post-image').first().attr('src') || ''
    const rating = card.find('div.numscore').first().text().trim()
    const status = card.find('div.flex.items-center.gap-1.font-normal.text-xs > p').first().text().trim()
    const chapterLink = card.find('a.link-self').first()
    const chapterUrl = chapterLink.attr('href') || ''
    const date = card.find('time').first().attr('datetime') || ''

    if (title) {
      komik.push({
        slug,
        title,
        thumbnail,
        rating,
        status,
        latestChapter: chapterUrl.split('/').filter(Boolean).pop() || '',
        date,
      })
    }
  })

  return komik
}

export async function getHome(page: number = 1): Promise<KomikListResponse> {
  const domain = getDomain()
  const url = page === 1 ? domain : `${domain}/page/${page}/`
  const { data } = await axiosInstance.get(url)
  const komik = parseKomikCards(data)

  const $ = cheerio.load(data)
  let totalPages = 1
  const pageLinks = $('a.page-numbers:not(.next):not(.prev)')
  if (pageLinks.length > 0) {
    const nums = pageLinks.map((_, el) => parseInt($(el).text().trim())).get().filter(n => !isNaN(n))
    if (nums.length > 0) totalPages = Math.max(...nums)
  }

  return { komik, totalPages, currentPage: page }
}

export async function getPopular(page: number = 1): Promise<KomikListResponse> {
  const domain = getDomain()
  const nonce = await getSearchNonce()

  const params = new URLSearchParams()
  params.append('nonce', nonce)
  params.append('page', String(page))
  params.append('order', 'desc')
  params.append('orderby', 'popular')

  const { data } = await axiosInstance.post(
    `${domain}/wp-admin/admin-ajax.php?action=advanced_search`,
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

  const $ = cheerio.load(data)
  const seen = new Set<string>()
  const komik: Komik[] = []

  $('div.group-data-\\[mode\\=horizontal\\]\\:hidden').each((_, el) => {
    const card = $(el)
    const link = card.find('a[color="primary"]').first()
    const href = link.attr('href') || ''
    const slug = href.split('/manga/')[1]?.replace(/\/$/, '') || ''
    if (!slug || seen.has(slug)) return
    seen.add(slug)

    const title = card.find('h1.text-\\[15px\\]').first().text().trim()
    const thumbnail = card.find('img.wp-post-image').first().attr('src') || ''
    const rating = card.find('div.numscore').first().text().trim()

    if (title) {
      komik.push({ slug, title, thumbnail, rating })
    }
  })

  return { komik, currentPage: page }
}

export async function getDetail(slug: string): Promise<Komik | null> {
  const domain = getDomain()
  const url = `${domain}/manga/${slug}/`
  const { data } = await axiosInstance.get(url)
  const $ = cheerio.load(data)

  const title = $('h1[itemprop="name"]').first().text().trim()
  if (!title) return null

  const thumbnail = $('img.wp-post-image').first().attr('src') || ''
  const synopsis = $('div[itemprop="description"][data-show="true"]').first().text().trim()
  const rating = $('li:has([data-lucide="star"]) span.font-bold').first().text().trim()

  const genres: string[] = []
  $('a[itemprop="genre"]').each((_, el) => {
    const genre = $(el).find('span.flex-1').first().text().trim()
    if (genre) genres.push(genre)
  })

  let type = ''
  let status = ''
  let author = ''
  let released = ''
  $('div.flex.sm\\:justify-between.justify-start.items-center.gap-2').each((_, el) => {
    const row = $(el)
    const label = row.find('span.font-semibold').first().text().trim().toLowerCase()
    const value = row.find('p.font-normal.text-sm').first().text().trim()
    if (label === 'type') type = value
    else if (label === 'status') status = value
    else if (label === 'author') author = value
    else if (label === 'released') released = value
  })

  if (!status) {
    status = $('div.flex.items-center.gap-1.font-normal.text-xs > p').first().text().trim()
  }

  let mangaId = ''
  const chapterListEl = $('#chapter-list')
  const hxGet = chapterListEl.attr('hx-get')
  if (hxGet) {
    const params = new URLSearchParams(hxGet.split('?')[1])
    mangaId = params.get('manga_id') || ''
  }

  let chapters: Chapter[] = []
  if (mangaId) {
    try {
      chapters = await getChapterList(mangaId)
    } catch {
      chapters = []
    }
  }

  return {
    slug,
    title,
    thumbnail,
    type,
    status,
    rating,
    synopsis,
    genres,
    author,
    chapters,
  }
}

export async function getChapterList(mangaId: string): Promise<Chapter[]> {
  const domain = getDomain()
  const url = `${domain}/wp-admin/admin-ajax.php?manga_id=${mangaId}&page=1&action=chapter_list`
  const { data } = await axiosInstance.get(url, {
    headers: { 'Referer': `${domain}/manga/` },
  })
  const $ = cheerio.load(data)

  const chapters: Chapter[] = []
  $('div[data-chapter-number] a, a[href*="chapter-"]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const slug = href.split('/').filter(Boolean).pop() || ''
    const text = $(el).text().trim()
    const match = slug.match(/chapter-([\d.]+)/)
    if (match && slug) {
      chapters.push({
        slug,
        number: match[1],
        title: text || undefined,
      })
    }
  })

  return chapters
}

export async function getChapterImages(slug: string, chapterSlug: string): Promise<ChapterDetail | null> {
  const domain = getDomain()
  const url = `${domain}/manga/${slug}/${chapterSlug}/`
  const { data } = await axiosInstance.get(url)
  const $ = cheerio.load(data)

  const images: string[] = []
  $('section[data-image-data="1"] img').each((_, el) => {
    const src = $(el).attr('src')
    if (src) images.push(src)
  })

  if (images.length === 0) return null

  let prev = ''
  let next = ''
  const prevBtn = $('#previous-chapter')
  const nextBtn = $('#next-chapter')
  const prevOnClick = prevBtn.attr('onclick') || ''
  const nextOnClick = nextBtn.attr('onclick') || ''
  const prevMatch = prevOnClick.match(/href='([^']+)'/)
  const nextMatch = nextOnClick.match(/href='([^']+)'/)
  if (prevMatch) prev = prevMatch[1].split('/').filter(Boolean).pop() || ''
  if (nextMatch) next = nextMatch[1].split('/').filter(Boolean).pop() || ''

  let chapters: Chapter[] = []
  const chapterListEl = $('#chapter-list')
  const hxGet = chapterListEl.attr('hx-get')
  if (hxGet) {
    const params = new URLSearchParams(hxGet.split('?')[1])
    const mangaId = params.get('manga_id') || ''
    if (mangaId) {
      try {
        chapters = await getChapterList(mangaId)
      } catch {
        chapters = []
      }
    }
  }

  if (chapters.length === 0) {
    try {
      const detail = await getDetail(slug)
      if (detail?.chapters) {
        chapters = detail.chapters
      }
    } catch {
      chapters = []
    }
  }

  return { images, prev, next, chapters }
}

export async function searchKomik(query: string, _page: number = 1): Promise<KomikListResponse> {
  const domain = getDomain()
  const nonce = await getSearchNonce()

  const params = new URLSearchParams()
  params.append('query', query)

  const { data } = await axiosInstance.post(
    `${domain}/wp-admin/admin-ajax.php?nonce=${nonce}&action=search`,
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' } }
  )

  const $ = cheerio.load(data)
  const komik: Komik[] = []

  $('#searchResults a').each((_, el) => {
    const href = $(el).attr('href') || ''
    const slug = href.split('/manga/')[1]?.replace(/\/$/, '') || ''
    const title = $(el).find('h3').first().text().trim()
    const thumbnail = $(el).find('img').first().attr('src') || ''
    if (slug && title) {
      komik.push({ slug, title, thumbnail })
    }
  })

  return { komik }
}

let cachedNonce = ''

async function getSearchNonce(): Promise<string> {
  if (cachedNonce) return cachedNonce
  const domain = getDomain()
  const { data } = await axiosInstance.get(domain)
  const match = data.match(/nonce=([a-f0-9]+)/)
  if (match) {
    cachedNonce = match[1]
    return cachedNonce
  }
  return ''
}

export async function getGenreList(): Promise<Genre[]> {
  const domain = getDomain()
  const seen = new Set<string>()
  const genres: Genre[] = []

  const homeData = await getHome(1)
  const slugs = homeData.komik.slice(0, 20).map(k => k.slug)

  const results = await Promise.allSettled(
    slugs.map(slug =>
      axiosInstance.get(`${domain}/manga/${slug}/`).then(({ data }) => {
        const $ = cheerio.load(data)
        const out: Genre[] = []
        $('a[itemprop="genre"]').each((_, el) => {
          const href = $(el).attr('href') || ''
          const slug2 = href.split('/genre/')[1]?.replace(/\/$/, '') || ''
          const name = $(el).find('span.flex-1').first().text().trim() || $(el).text().trim()
          if (slug2 && name && !seen.has(slug2)) {
            seen.add(slug2)
            out.push({ slug: slug2, name })
          }
        })
        return out
      })
    )
  )

  for (const r of results) {
    if (r.status === 'fulfilled') genres.push(...r.value)
  }

  return genres
}

export async function getGenre(genre: string, page: number = 1): Promise<KomikListResponse> {
  const domain = getDomain()
  const nonce = await getSearchNonce()

  const params = new URLSearchParams()
  params.append('nonce', nonce)
  params.append('genre', JSON.stringify([genre]))
  params.append('page', String(page))
  params.append('order', 'desc')
  params.append('orderby', 'popular')

  const { data } = await axiosInstance.post(
    `${domain}/wp-admin/admin-ajax.php?action=advanced_search`,
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

  const $ = cheerio.load(data)
  const seen = new Set<string>()
  const komik: Komik[] = []

  $('div.group-data-\\[mode\\=horizontal\\]\\:hidden').each((_, el) => {
    const card = $(el)
    const link = card.find('a[color="primary"]').first()
    const href = link.attr('href') || ''
    const slug = href.split('/manga/')[1]?.replace(/\/$/, '') || ''
    if (!slug || seen.has(slug)) return
    seen.add(slug)

    const title = card.find('h1.text-\\[15px\\]').first().text().trim()
    const thumbnail = card.find('img.wp-post-image').first().attr('src') || ''
    const rating = card.find('div.numscore').first().text().trim()
    const status = card.find('p.font-normal.text-xs').last().text().trim()

    if (title) {
      komik.push({ slug, title, thumbnail, rating, status })
    }
  })

  let totalPages = 1
  const pageBtns = $('button[onclick*="addSingularFilter"]').filter((_, el) => {
    return /addSingularFilter\('page',\s*'(\d+)'/i.test($(el).attr('onclick') || '')
  })
  const nums = pageBtns.map((_, el) => {
    const m = $(el).attr('onclick')?.match(/addSingularFilter\('page',\s*'(\d+)'/i)
    return m ? parseInt(m[1]) : NaN
  }).get().filter(n => !isNaN(n))
  if (nums.length > 0) totalPages = Math.max(...nums)

  return { komik, totalPages, currentPage: page }
}
