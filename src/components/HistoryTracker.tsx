'use client'

import { useEffect } from 'react'
import { addToHistory } from '@/src/lib/storage'
import { BookmarkItem } from '@/src/types'

interface Props {
  komik: BookmarkItem
}

export default function HistoryTracker({ komik }: Props) {
  useEffect(() => {
    addToHistory(komik)
  }, [komik])

  return null
}
