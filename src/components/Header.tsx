'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import SearchBar from './SearchBar'

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)
  const headerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setHidden(true)
      } else {
        setHidden(false)
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node) && mobileOpen) {
        setMobileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mobileOpen])

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 bg-[#0f0f1a]/80 backdrop-blur-md border-b border-white/5 transition-transform duration-300 ${hidden ? '-translate-y-full' : 'translate-y-0'}`}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-white">
            Komikin<span className="text-[#a855f7]">.Aja</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm text-gray-300 hover:text-white transition-colors">
            Home
          </Link>
          <Link href="/genres" className="text-sm text-gray-300 hover:text-white transition-colors">
            Genres
          </Link>
          <Link href="/search" className="text-sm text-gray-300 hover:text-white transition-colors">
            Search
          </Link>
        </nav>

        <div className="hidden md:block w-64">
          <SearchBar />
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-white p-2"
          aria-label="Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-[#0f0f1a] px-4 py-4 space-y-4">
          <SearchBar onSearch={() => setMobileOpen(false)} />
          <nav className="flex flex-col gap-2">
            <Link href="/" className="text-sm text-gray-300 hover:text-white py-1" onClick={() => setMobileOpen(false)}>
              Home
            </Link>
            <Link href="/genres" className="text-sm text-gray-300 hover:text-white py-1" onClick={() => setMobileOpen(false)}>
              Genres
            </Link>
            <Link href="/search" className="text-sm text-gray-300 hover:text-white py-1" onClick={() => setMobileOpen(false)}>
              Search
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}