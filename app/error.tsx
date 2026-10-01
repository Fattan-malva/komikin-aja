'use client'

import { useEffect } from 'react'
import Link from 'next/link'

/**
 * Error boundary untuk seluruh route. Tanpa ini, satu sumber komik yang sedang
 * down membuat Next mengganti seluruh halaman dengan layar
 * "This page couldn't load" - padahal menu dan navigasi lain masih bisa dipakai.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
        Sumber komik sedang tidak bisa dihubungi
      </h2>
      <p className="text-gray-400 mb-2 max-w-md">
        Halaman ini gagal dimuat karena situs sumber sedang tidak bisa diakses
        dari server kami. Biasanya perlu beberapa saat, atau domain sumber sedang
        dibatasi.
      </p>
      {error.digest && (
        <p className="text-xs text-gray-600 mb-6 font-mono">Kode: {error.digest}</p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-[#a855f7] text-white rounded-lg hover:bg-[#9333ea] transition-colors"
        >
          Coba lagi
        </button>
        <Link
          href="/"
          className="px-6 py-2.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
        >
          Kembali ke Home
        </Link>
      </div>
    </div>
  )
}