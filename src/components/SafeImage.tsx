'use client'

import { useState } from 'react'

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> {
  src: string
  proxySrc: string
}

export function SafeImage({ src, proxySrc, alt, className, ...props }: SafeImageProps) {
  const [useProxy, setUseProxy] = useState(false)

  return (
    <img
      src={useProxy ? proxySrc : src}
      alt={alt}
      className={className}
      onError={() => setUseProxy(true)}
      referrerPolicy="no-referrer"
      {...props}
    />
  )
}
