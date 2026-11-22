'use client'

import { useRouter } from 'next/navigation'
import { useState, FormEvent } from 'react'
import { MODE_COOKIE } from '@/src/lib/mode'

interface SearchBarProps {
  onSearch?: () => void
  initialQuery?: string
}

export default function SearchBar({ onSearch, initialQuery = '' }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery)
  const router = useRouter()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const term = query.trim()
    if (!term) return

    const mode = term.toLowerCase()
    if (mode === 'h-mode' || mode === 'k-mode') {
      const value = mode === 'h-mode' ? 'h' : 'k'
      document.cookie = `${MODE_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`
      setQuery('')
      router.replace('/')
      router.refresh()
      onSearch?.()
      return
    }

    router.push(`/search?q=${encodeURIComponent(term)}`)
    onSearch?.()
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search komik..."
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-base md:text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent transition-all"
      />
      <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
    </form>
  )
}
