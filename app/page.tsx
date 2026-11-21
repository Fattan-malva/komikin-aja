import { Suspense } from 'react'
import { connection } from 'next/server'
import { cookies } from 'next/headers'
import { getHome, getDetail, getPopular, getManhwa, getManga, getManhua } from '@/src/lib/scraper'
import { getHomeH, getDetailH } from '@/src/lib/scrapper-h'
import { stripHPrefix } from '@/src/lib/utils'
import { MODE_COOKIE, isHMode } from '@/src/lib/mode'
import BannerCarousel from '@/src/components/BannerCarousel'
import PopularScroll from '@/src/components/PopularScroll'
import LatestUpdates from '@/src/components/LatestUpdates'
import TypeScroll from '@/src/components/TypeScroll'
import Pagination from '@/src/components/Pagination'
import { SkeletonGrid } from '@/src/components/Skeleton'

interface Props {
  searchParams: Promise<{ page?: string }>
}

/**
 * Satu sumber mati tidak boleh menjatuhkan seluruh homepage. Komponen di
 * bawah sudah mengembalikan null untuk daftar kosong, jadi cukup kembalikan
 * daftar kosong dan biarkan seksi itu hilang saja.
 */
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

const EMPTY: { komik: [] } = { komik: [] }

async function BannerSection({ hMode }: { hMode: boolean }) {
  const homeData = await safe(() => (hMode ? getHomeH(1) : getHome(1)), EMPTY)
  const bannerManga = homeData.komik.slice(0, 5)
  const results = await Promise.allSettled(
    bannerManga.map(m =>
      hMode
        ? getDetailH(stripHPrefix(m.slug)).then(detail => detail && { ...detail, slug: m.slug })
        : getDetail(m.slug),
    ),
  )
  const bannerData = bannerManga.map((m, i) => {
    if (results[i].status === 'fulfilled' && results[i].value) {
      return results[i].value
    }
    return m
  })
  return <BannerCarousel items={bannerData} />
}

function BannerFallback() {
  return <div className="w-full h-[400px] sm:h-[500px] rounded-2xl mb-10 bg-white/5 animate-pulse" />
}

async function PopularSection() {
  const data = await safe(() => getPopular(1), EMPTY)
  return <PopularScroll items={data.komik} />
}

function ScrollFallback() {
  return (
    <section className="mb-10 animate-pulse">
      <div className="h-6 bg-white/5 rounded w-24 mb-4" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="w-32 shrink-0">
            <div className="aspect-[3/4] rounded-lg bg-white/5 mb-2" />
            <div className="h-4 bg-white/5 rounded w-3/4 mb-1" />
            <div className="h-3 bg-white/5 rounded w-1/2" />
          </div>
        ))}
      </div>
    </section>
  )
}

async function ManhwaSection() {
  const data = await safe(() => getManhwa(1), EMPTY)
  return <TypeScroll items={data.komik} title="Manhwa" />
}

async function MangaSection() {
  const data = await safe(() => getManga(1), EMPTY)
  return <TypeScroll items={data.komik} title="Manga" />
}

async function ManhuaSection() {
  const data = await safe(() => getManhua(1), EMPTY)
  return <TypeScroll items={data.komik} title="Manhua" />
}

async function LatestSection({ searchParams, hMode }: Props & { hMode: boolean }) {
  const { page } = await searchParams
  const currentPage = Number(page) || 1
  const data = await safe(() => (hMode ? getHomeH(currentPage) : getHome(currentPage)), EMPTY)
  return (
    <>
      <LatestUpdates items={data.komik} />
      {data.totalPages && data.totalPages > 1 && (
        <Pagination currentPage={data.currentPage || 1} totalPages={data.totalPages} />
      )}
    </>
  )
}

export default async function Home({ searchParams }: Props) {
  await connection()
  const hMode = isHMode((await cookies()).get(MODE_COOKIE)?.value)
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Suspense fallback={<BannerFallback />}>
        <BannerSection hMode={hMode} />
      </Suspense>

      {/* Sumber H tidak menyediakan endpoint popular/per-tipe yang setara. */}
      {!hMode && (
        <>
          <Suspense fallback={<ScrollFallback />}>
            <PopularSection />
          </Suspense>

          <Suspense fallback={<ScrollFallback />}>
            <ManhwaSection />
          </Suspense>

          <Suspense fallback={<ScrollFallback />}>
            <MangaSection />
          </Suspense>

          <Suspense fallback={<ScrollFallback />}>
            <ManhuaSection />
          </Suspense>
        </>
      )}

      <Suspense fallback={<SkeletonGrid />}>
        <LatestSection searchParams={searchParams} hMode={hMode} />
      </Suspense>
    </div>
  )
}
