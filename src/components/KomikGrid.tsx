import type { Komik } from '@/src/types'
import KomikCard from './KomikCard'

interface Props {
  komik: Komik[]
}

export default function KomikGrid({ komik }: Props) {
  if (komik.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg">Tidak ada komik ditemukan</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {komik.map(k => (
        <KomikCard key={k.slug} komik={k} />
      ))}
    </div>
  )
}
