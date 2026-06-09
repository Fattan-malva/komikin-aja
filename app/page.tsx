import { getHome, getDetail, getPopular } from '@/src/lib/scraper'
import Pagination from '@/src/components/Pagination'
import BannerCarousel from '@/src/components/BannerCarousel'
import PopularScroll from '@/src/components/PopularScroll'
import LatestUpdates from '@/src/components/LatestUpdates'

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function Home({ searchParams }: Props) {
  const { page } = await searchParams
  const currentPage = Number(page) || 1
  
  const [homeData, popularData] = await Promise.all([
    getHome(currentPage),
    getPopular(1),
  ])

  // Fetch details for the first 5 manga for the banner carousel to get synopsis and genres
  const bannerManga = homeData.komik.slice(0, 5)
  const bannerData = await Promise.all(
    bannerManga.map(async (m) => {
      const detail = await getDetail(m.slug)
      return detail || m
    })
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BannerCarousel items={bannerData} />
      
      <PopularScroll items={popularData.komik} />
      
      <LatestUpdates items={homeData.komik} />

      {homeData.totalPages && homeData.totalPages > 1 && (
        <Pagination currentPage={homeData.currentPage || 1} totalPages={homeData.totalPages} />
      )}
    </div>
  )
}
