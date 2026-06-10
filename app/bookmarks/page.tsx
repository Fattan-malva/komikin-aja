'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBookmarks, getHistory } from '@/src/lib/storage'
import { Komik, BookmarkItem, HistoryItem } from '@/src/types'

// Komponen Kartu Bookmark sederhana untuk layout horizontal 2 baris
function BookmarkCard({ item }: { item: Komik }) {
  return (
    <Link href={`/komik/${item.slug}`} className="block group">
      <div className="w-40 sm:w-48 flex-shrink-0 bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-purple-500/50 transition-all duration-300">
        <div className="aspect-[3/4] relative overflow-hidden bg-gray-800">
          <img 
            src={item.thumbnail || '/placeholder-comic.jpg'} 
            alt={item.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="p-3">
          <h3 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-purple-400 transition-colors">
            {item.title}
          </h3>
        </div>
      </div>
    </Link>
  )
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])

  useEffect(() => {
    setBookmarks(getBookmarks())
    setHistory(getHistory())
  }, [])

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white p-6">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* ================= SECTION BOOKMARK ================= */}
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
            <div className="relative">
              {/* Container scroll horizontal */}
              <div 
                className="flex overflow-x-auto pb-4 gap-4"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Menyembunyikan scrollbar di Firefox & IE/Edge
              >
                {/* 
                  grid-rows-2: Memaksa hanya ada 2 baris
                  grid-flow-col: Mengisi baris dulu, baru pindah ke kolom berikutnya (ke kanan)
                  auto-cols-[160px]: Lebar tetap per kolom agar bisa di-scroll
                */}
                <div className="grid grid-rows-2 grid-flow-col gap-4 auto-cols-[160px] sm:auto-cols-[200px]">
                  {bookmarks.map((item) => (
                    <BookmarkCard key={item.slug} item={item as Komik} />
                  ))}
                </div>
              </div>
              {/* Hack untuk menyembunyikan scrollbar di Webkit (Chrome/Safari) */}
              <style jsx>{`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
            </div>
          ) : (
            <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
              <p className="text-gray-400">Belum ada komik yang di-bookmark</p>
            </div>
          )}
        </section>

        {/* ================= SECTION HISTORY ================= */}
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
            // Container scroll vertikal dengan tinggi maksimal
            <div className="max-h-[500px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              {history.map((item) => (
                <Link 
                  key={item.slug} 
                  href={`/komik/${item.slug}`}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 hover:border-blue-500/50 transition-all duration-300 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600/20 rounded-lg">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 font-mono">
                        {item.lastChapter ? `Chapter ${item.lastChapter.replace('chapter-', '').split('.')[0]}` : `/${item.slug}`}
                      </p>
                    </div>
                  </div>
                  
                  {/* Panah indikator */}
                  <svg className="w-5 h-5 text-gray-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
              <p className="text-gray-400">Belum ada riwayat baca</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}////////