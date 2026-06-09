'use client'

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
