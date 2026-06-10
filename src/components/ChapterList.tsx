'use client'

import Link from 'next/link'
import type { Chapter } from '@/src/types'
import { addReadChapter, getReadChapters } from '@/src/lib/storage'
import { useEffect, useState } from 'react'

interface Props {
  slug: string
}

export default function ChapterList({ slug }: Props) {
  const [chapters, setChapters] = useState<Chapter[] | null>(null)
  const [readChapters, setReadChapters] = useState<Set<string>>(new Set())

  useEffect(() => {
    setReadChapters(getReadChapters())
  }, [])

  useEffect(() => {
    fetch(`/api/komik/${slug}?_=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data?.chapters) {
          const sorted = (data.chapters as Chapter[]).sort(
            (a, b) => parseFloat(b.number || '0') - parseFloat(a.number || '0'),
          )
          setChapters(sorted)
        }
      })
      .catch(() => {})
  }, [slug])

  const handleChapterClick = (chapterSlug: string) => {
    addReadChapter(chapterSlug)
  }

  if (chapters === null) {
    return (
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 animate-pulse">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 rounded-lg bg-white/5 border border-transparent">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full bg-white/10 flex-shrink-0" />
              <div className="h-4 bg-white/10 rounded w-40" />
            </div>
            <div className="h-3 bg-white/10 rounded w-16 flex-shrink-0" />
          </div>
        ))}
      </div>
    )
  }

  if (chapters.length === 0) {
    return <p className="text-gray-400 text-sm">Tidak ada chapter tersedia</p>
  }

  return (
    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
      {chapters.map((ch) => {
        const isRead = readChapters.has(ch.slug)
        return (
          <Link
            key={ch.slug}
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
                {ch.title ?? ''}
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