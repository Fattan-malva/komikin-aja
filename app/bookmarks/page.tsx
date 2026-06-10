'use client'

import { useEffect, useState } from 'react'
import KomikGrid from '@/src/components/KomikGrid'
import { getBookmarks, getHistory } from '@/src/lib/storage'
import { Komik, BookmarkItem, HistoryItem } from '@/src/types'

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Komik[]>([])
  const [history, setHistory] = useState<Komik[]>([])

  useEffect(() => {
    const bms = getBookmarks().map(b => ({
      slug: b.slug,
      title: b.title,
      thumbnail: b.thumbnail,
    }))
    const hist = getHistory().map(h => ({
      slug: h.slug,
      title: h.title,
      thumbnail: h.thumbnail,
    }))
    
    setBookmarks(bms)
    setHistory(hist)
  }, [])

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white p-6">
      <div className="max-w-6xl mx-auto space-y-12">
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-600 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">Bookmark Saya</h1>
          </div>
          
          {bookmarks.length > 0 ? (
            <KomikGrid komik={bookmarks} />
          ) : (
            <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
              <p className="text-gray-400">Belum ada komik yang di-bookmark</p>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-600 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">Riwayat Baca</h1>
          </div>

          {history.length > 0 ? (
            <KomikGrid komik={history} />
          ) : (
            <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
              <p className="text-gray-400">Belum ada riwayat baca</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
