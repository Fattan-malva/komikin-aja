'use client'

import Link from 'next/link'
import type { Komik } from '@/src/types'
import { getImageUrls } from '@/src/lib/utils'
import { SafeImage } from '@/src/components/SafeImage'
import Image from 'next/image'
import TypeBadge from './TypeBadge'

interface Props {
    items: Komik[]
    title: string
    icon?: React.ReactNode
}

export default function TypeScroll({ items, title, icon }: Props) {
    if (!items.length) return null

    const getIcon = () => {
        if (icon) return icon

        const iconClass = "w-5 h-5"

        switch (title.toLowerCase()) {
            case 'manhwa':
                return <Image src="/manhwa.svg" width={20} height={20} alt="manhwa" />

            case 'manga':
                return <Image src="/manga.svg" width={20} height={20} alt="manga" />

            case 'manhua':
                return <Image src="/manhua.svg" width={20} height={20} alt="manhua" />

            default:
                return <Image src="/globe.svg" width={20} height={20} alt="default" />
        }
    }

    return (
        <section className="mb-10">
            {/* HEADER (SAMAKAN DENGAN POPULAR) */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {getIcon()}
                    {title}
                </h2>
            </div>

            {/* SCROLL AREA (SAMA PERSIS POPULAR) */}
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
                {items.map((k) => (
                    <Link
                        key={k.slug}
                        href={`/komik/${k.slug}`}
                        className="flex-shrink-0 w-32 group"
                    >
                        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-white/5 mb-2">
                            <SafeImage
                                src={getImageUrls(k.thumbnail).direct}
                                proxySrc={getImageUrls(k.thumbnail).proxy}
                                alt={k.title}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                loading="lazy"
                            />
                            <TypeBadge type={k.type} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            {k.rating && (
                                <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-black/60 rounded-md px-1.5 py-0.5 text-xs text-yellow-400 font-semibold">
                                    <svg className="w-3 h-3 fill-yellow-400" viewBox="0 0 24 24">
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                    </svg>
                                    {k.rating}
                                </div>
                            )}

                            {k.status && (
                                <div className="absolute bottom-1.5 left-1.5 bg-black/60 rounded-md px-1.5 py-0.5 text-xs text-gray-300">
                                    {k.status}
                                </div>
                            )}
                        </div>

                        <h3 className="text-sm font-semibold text-gray-100 line-clamp-2 leading-tight group-hover:text-[#a855f7] transition-colors">
                            {k.title}
                        </h3>
                    </Link>
                ))}
            </div>
        </section>
    )
}