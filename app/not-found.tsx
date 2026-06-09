import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <h2 className="text-4xl font-bold text-white mb-4">404</h2>
      <p className="text-gray-400 mb-6">Halaman tidak ditemukan</p>
      <Link
        href="/"
        className="px-6 py-2.5 bg-[#a855f7] text-white rounded-lg hover:bg-[#9333ea] transition-colors"
      >
        Kembali ke Home
      </Link>
    </div>
  )
}
