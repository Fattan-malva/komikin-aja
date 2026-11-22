import { mapWithConcurrency } from './http'
import { getDetail, getGenre, getHome, getPopular } from './scraper'
import { getDetailH, getGenreH, getHomeH } from './scrapper-h'
import { filterKomik, stripHPrefix } from './utils'
import type { KomikListResponse, SearchFilters } from '@/src/types'

/** Daftar untuk filter tanpa query: genre pakai endpoint genre, sisanya daftar biasa. */
export async function getFilteredList(
  hMode: boolean,
  filters: SearchFilters,
  page: number,
): Promise<KomikListResponse> {
  const base = filters.genre
    ? (hMode ? getGenreH(filters.genre, page) : getGenre(filters.genre, page))
    : hMode
      ? getHomeH(page)
      : filters.orderby === 'popular'
        ? getPopular(page)
        : getHome(page)

  const data = await base
  // Endpoint genre sudah membatasi genre, dan item H tidak membawa field genres.
  // Author/artist baru ada setelah detail diambil, jadi belum disaring di sini.
  const basic = { type: filters.type, status: filters.status, orderby: filters.orderby, order: filters.order }
  let komik = filterKomik(data.komik, basic)

  if (filters.author || filters.artist) {
    const details = await mapWithConcurrency(komik, 6, k =>
      hMode ? getDetailH(stripHPrefix(k.slug)) : getDetail(k.slug),
    )
    const enriched = komik.map((k, i) => {
      const detail = details[i]
      if (!detail) return k
      return { ...detail, slug: k.slug, title: k.title, thumbnail: k.thumbnail || detail.thumbnail }
    })
    komik = filterKomik(enriched, { author: filters.author, artist: filters.artist })
  }

  return { ...data, komik }
}
