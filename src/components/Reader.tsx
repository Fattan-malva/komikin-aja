'use client'

import Link from 'next/link'
import type { ChapterDetail } from '@/src/types'
import { proxyImage } from '@/src/lib/utils'

interface Props {
  slug: string
  chapterId: string
  data: ChapterDetail
}

export default function Reader({ slug, chapterId, data }: Props) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 px-4">
        <div>
          {data.prev ? (
            <Link
              href={`/baca/${slug}/${data.prev}`}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Prev
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-white/5 text-gray-500 cursor-not-allowed">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Prev
            </span>
          )}
        </div>

        <Link
          href={`/komik/${slug}`}
          className="text-sm text-[#a855f7] hover:underline"
        >
          Back to Detail
        </Link>

        <div>
          {data.next ? (
            <Link
              href={`/baca/${slug}/${data.next}`}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-white/5 text-gray-500 cursor-not-allowed">
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          )}
        </div>
      </div>

      <div className="space-y-0">
        {data.images.map((img, i) => (
          <div key={i} className="w-full bg-black/20">
            <img
              src={proxyImage(img)}
              alt={`${chapterId} - Page ${i + 1}`}
              className="w-full h-auto mx-auto"
              loading="lazy"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4 px-4 pb-8">
        <div>
          {data.prev ? (
            <Link
              href={`/baca/${slug}/${data.prev}`}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Prev Chapter
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-white/5 text-gray-500 cursor-not-allowed">
              Prev Chapter
            </span>
          )}
        </div>

        <Link
          href={`/komik/${slug}`}
          className="text-sm text-[#a855f7] hover:underline"
        >
          Back to Detail
        </Link>

        <div>
          {data.next ? (
            <Link
              href={`/baca/${slug}/${data.next}`}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
            >
              Next Chapter
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-white/5 text-gray-500 cursor-not-allowed">
              Next Chapter
            </span>
          )}
        </div>
      </div>
    </div>
  )
}