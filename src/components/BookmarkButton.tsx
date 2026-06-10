'use client'

import { useState, useEffect } from 'react'
import { getBookmarks, toggleBookmark, BookmarkItem } from '@/src/lib/storage'

interface Props {
  komik: BookmarkItem
}

export default function BookmarkButton({ komik }: Props) {
  const [isBookmarked, setIsBookmarked] = useState(false)

  useEffect(() => {
    const bookmarks = getBookmarks()
    setIsBookmarked(bookmarks.some(b => b.slug === komik.slug))
  }, [komik.slug])

  const handleToggle = () => {
    const result = toggleBookmark(komik)
    setIsBookmarked(result)
  }

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm ${
        isBookmarked 
          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' 
          : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
      }`}
    >
      <svg 
        className={`w-4 h-4 ${isBookmarked ? 'fill-current' : 'fill-none'}`} 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
      {isBookmarked ? 'Bookmarked' : 'Bookmark'}
    </button>
  )
}
