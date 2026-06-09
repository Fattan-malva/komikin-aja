'use client'

import Link from 'next/link'
import type { Chapter } from '@/src/types'
import { addReadChapter, getReadChapters } from '@/src/lib/storage'
import { useEffect, useState, useCallback } from 'react'

interface Props {
  slug: string
  chapters: Chapter[]
}

export default function ChapterList({ slug, chapters }: Props) {
  const [readChapters, setReadChapters] = useState<Set<string>>(new Set())

  useEffect(() => {
    setReadChapters(getReadChapters())
  }, [])

  const handleChapterClick = (chapterSlug: string) => {
    addReadChapter(chapterSlug)
    // Optionally, update state here if needed immediately, though not critical for list display
  }

  if (chapters.length === 0) {
    return <p className="text-gray-400 text-sm">Tidak ada chapter tersedia</p>
  }

  return (
    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
      {chapters.map((ch, i) => {
        const isRead = readChapters.has(ch.slug)
        return (
          <Link
            key={ch.slug + i}
            href={`/baca/${slug}/${ch.slug}`}
            onClick={() => handleChapterClick(ch.slug)}
            className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${isRead
                ? 'bg-purple-600/20 border border-purple-500/30'
                : 'bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 text-gray-300 group'
              }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {isRead && (
                <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0 animate-pulse"></div>
              )}
              <span className={`text-sm ${isRead
                  ? 'text-purple-300 font-medium'
                  : 'text-gray-300 group-hover:text-white'
                }`}>
                {ch.title ? `${ch.title}` : '' }
              </span>
            </div>
            {ch.date && (
              <span className={`text-xs flex-shrink-0 ${isRead
                  ? 'text-purple-300/80'
                  : 'text-gray-400 group-hover:text-gray-300'
                }`}>
                {ch.date}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}