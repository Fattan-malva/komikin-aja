'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Chapter, ChapterDetail } from '@/src/types'
import { proxyImage } from '@/src/lib/utils'
import { getReadChapters, addReadChapter } from '@/src/lib/storage'


interface Props {
  slug: string
  chapterId: string
  data: ChapterDetail
}

export default function Reader({ slug, chapterId, data }: Props) {
  const [navOpen, setNavOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [readChapters] = useState(() => getReadChapters())

  const currentNum = chapterId.replace('chapter-', '').split('.')[0]

  const isReading = readChapters.has(chapterId)

  const handleChapterClick = (chapterSlug: string) => {
    addReadChapter(chapterSlug)
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
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

      {/* Floating Nav Panel */}
      <div className="fixed bottom-6 right-6 z-50">
        <div
          className={`absolute bottom-[72px] right-0 bg-[#1a1a2e]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl shadow-black/40 overflow-hidden transition-all duration-300 ease-out origin-bottom-right ${
            navOpen
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
          }`}
        >
          <div className="w-64">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Navigasi</span>
            </div>

            <div className="p-2 space-y-1">
              {data.prev ? (
                <Link
                  href={`/baca/${slug}/${data.prev}`}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 transition-colors text-white"
                  onClick={() => {
                    setNavOpen(false)
                    addReadChapter(data.prev!)
                  }}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-sm">Prev Chapter</span>
                </Link>
              ) : (
                <span className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-white/[0.02] text-gray-600 cursor-not-allowed">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-sm">Prev Chapter</span>
                </span>
              )}

              {data.next ? (
                <Link
                  href={`/baca/${slug}/${data.next}`}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 transition-colors text-white"
                  onClick={() => {
                    setNavOpen(false)
                    addReadChapter(data.next!)
                  }}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-sm">Next Chapter</span>
                </Link>
              ) : (
                <span className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-white/[0.02] text-gray-600 cursor-not-allowed">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-sm">Next Chapter</span>
                </span>
              )}

              <div className="my-1 border-t border-white/5" />

              {/* Chapter button — opens modal */}
              <button
                onClick={() => { setNavOpen(false); setModalOpen(true) }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-[#a855f7]/15 hover:bg-[#a855f7]/25 transition-colors text-[#c084fc] cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span className="text-sm">Chapter {currentNum}</span>
              </button>

              <Link
                href={`/komik/${slug}`}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 transition-colors text-gray-300"
                onClick={() => setNavOpen(false)}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="text-sm">Back to Detail</span>
              </Link>
            </div>
          </div>
        </div>

        {/* FAB Button */}
        <button
          onClick={() => setNavOpen(!navOpen)}
          className={`relative z-10 w-14 h-14 rounded-full bg-[#a855f7] hover:bg-[#9333ea] text-white shadow-lg shadow-purple-500/30 flex items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer ${
            navOpen ? 'rotate-45' : 'rotate-0'
          }`}
          aria-label="Navigation"
        >
          <svg className="w-6 h-6 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Nav Overlay */}
      {navOpen && (
        <div
          className="fixed inset-0 z-40 transition-opacity duration-300"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* Chapter List Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setModalOpen(false)}
          />

          <div className="relative w-full max-w-md bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 transform transition-all duration-300 animate-[modalIn_0.3s_ease-out]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h3 className="text-white font-semibold text-base">Daftar Chapter</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors p-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {data.chapters && data.chapters.length > 0 ? (
                data.chapters.map((ch) => {
                  const isRead = readChapters.has(ch.slug)
                  const isCurrent = ch.slug === chapterId
                  return (
                    <Link
                      key={ch.slug}
                      href={`/baca/${slug}/${ch.slug}`}
                      onClick={() => {
                        handleChapterClick(ch.slug)
                        setModalOpen(false)
                      }}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 mb-1 ${
                        isRead
                          ? 'bg-purple-600/20 border border-purple-500/30'
                          : 'bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isRead && (
                          <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0 animate-pulse" />
                        )}
                        <span className={`text-sm ${isRead ? 'text-purple-300 font-medium' : 'text-gray-300 group-hover:text-white'}`}>
                          {ch.title ? `${ch.title}` : `Chapter ${ch.number}`}
                        </span>
                      </div>
                      {ch.date && (
                        <span className={`text-xs flex-shrink-0 ${isRead ? 'text-purple-300/80' : 'text-gray-400'}`}>
                          {ch.date}
                        </span>
                      )}
                    </Link>
                  )
                })
              ) : (
                <div className="py-8 text-center text-gray-500 text-sm">
                  Tidak ada chapter tersedia
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-white/10 text-center">
              <Link href={`/komik/${slug}`} className="text-xs text-[#a855f7] hover:underline">
                Kembali ke Detail Komik
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}