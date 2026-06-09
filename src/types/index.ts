export interface Komik {
  slug: string
  title: string
  thumbnail: string
  type?: string
  status?: string
  rating?: string
  synopsis?: string
  genres?: string[]
  author?: string
  artist?: string
  latestChapter?: string
  date?: string
  chapters?: Chapter[]
}

export interface Chapter {
  slug: string
  number: string
  title?: string
  date?: string
}

export interface ChapterDetail {
  images: string[]
  prev?: string
  next?: string
}

export interface Genre {
  name: string
  slug: string
  count?: number
}

export interface KomikListResponse {
  komik: Komik[]
  totalPages?: number
  currentPage?: number
}

export interface SearchParams {
  q?: string
  page?: number
  genre?: string
}
