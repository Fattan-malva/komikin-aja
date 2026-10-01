'use client'

import { useState } from 'react'

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> {
  src: string
  proxySrc: string
}

/**
 * Sumber gambar dari scraper bisa kosong (komik tanpa cover). React menolak
 * `src=""` karena itu membuat browser mengunduh ulang halaman, jadi kalau tidak
 * ada URL yang bisa dipakai kita render kotak kosong, bukan tag <img>.
 */
export function SafeImage({ src, proxySrc, alt, className, ...props }: SafeImageProps) {
  const [useProxy, setUseProxy] = useState(false)

  const direct = src?.trim() ?? ''
  const proxy = proxySrc?.trim() ?? ''
  const current = useProxy ? proxy : direct

  if (!current) {
    return (
      <div
        aria-hidden={alt ? undefined : true}
        aria-label={alt}
        className={`${className ?? ''} bg-white/5 flex items-center justify-center`}
      />
    )
  }

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      onError={() => {
        // Kalau sumber langsung gagal, coba lewat proxy sekali saja.
        if (!useProxy && proxy && proxy !== current) setUseProxy(true)
      }}
      referrerPolicy="no-referrer"
      {...props}
    />
  )
}