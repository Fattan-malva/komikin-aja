'use client'

import type { HistoryItem } from '@/src/types'

export const READ_CHAPTERS_KEY = 'kiryuu-read-chapters'

export function getReadChapters(): Set<string> {
  try {
    const stored = localStorage.getItem(READ_CHAPTERS_KEY)
    if (!stored) return new Set()
    return new Set(JSON.parse(stored))
  } catch (error) {
    console.error("Error getting read chapters from localStorage:", error)
    return new Set()
  }
}

export function addReadChapter(slug: string): void {
  try {
    const readChapters = getReadChapters()
    readChapters.add(slug)
    localStorage.setItem(READ_CHAPTERS_KEY, JSON.stringify(Array.from(readChapters)))
  } catch (error) {
    console.error("Error adding read chapter to localStorage:", error)
  }
}

export const BOOKMARKS_KEY = 'kiryuu-bookmarks'
export const HISTORY_KEY = 'kiryuu-history'

export interface BookmarkItem {
  slug: string
  title: string
  thumbnail: string
}

export function getBookmarks(): BookmarkItem[] {
  try {
    const stored = localStorage.getItem(BOOKMARKS_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch (error) {
    console.error("Error getting bookmarks:", error)
    return []
  }
}

export function toggleBookmark(item: BookmarkItem): boolean {
  try {
    const bookmarks = getBookmarks()
    const index = bookmarks.findIndex(b => b.slug === item.slug)
    
    if (index !== -1) {
      bookmarks.splice(index, 1)
    } else {
      bookmarks.push(item)
    }
    
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks))
    return index === -1
  } catch (error) {
    console.error("Error toggling bookmark:", error)
    return false
  }
}

export function getHistory(): HistoryItem[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch (error) {
    console.error("Error getting history:", error)
    return []
  }
}

export function addToHistory(item: Omit<HistoryItem, 'timestamp'>): void {
  try {
    const history = getHistory()
    // Remove if already exists to move it to the top
    const filtered = history.filter(h => h.slug !== item.slug)
    const newHistory = [
      { ...item, timestamp: Date.now() },
      ...filtered
    ].slice(0, 50) // Keep last 50 items

    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory))
  } catch (error) {
    console.error("Error adding to history:", error)
  }
}

export function updateHistoryChapter(slug: string, chapter: string): void {
  try {
    const history = getHistory()
    const index = history.findIndex(h => h.slug === slug)
    if (index !== -1) {
      history[index].lastChapter = chapter
      history[index].timestamp = Date.now() // Update timestamp to move to top
      
      // Move to top
      const [item] = history.splice(index, 1)
      history.unshift(item)
      
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    }
  } catch (error) {
    console.error("Error updating history chapter:", error)
  }
}
