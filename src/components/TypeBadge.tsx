interface Props {
  type?: string
}

const icons: Record<string, { svg: React.ReactNode; label: string }> = {
  Manhwa: {
    svg: (
      <svg viewBox="0 0 36 36" className="w-full h-full">
        <circle cx="18" cy="18" r="16" fill="#EEE" />
        <circle cx="18" cy="18" r="12" fill="#ED1C27" />
        <path d="M18 6 A12 12 0 0 1 18 30 A8 8 0 0 0 18 14 A8 8 0 0 1 18 6" fill="#024FA2" />
      </svg>
    ),
    label: 'Manhwa',
  },
  Manga: {
    svg: (
      <svg viewBox="0 0 36 36" className="w-full h-full">
        <circle cx="18" cy="18" r="16" fill="#F5F5F5" />
        <circle cx="18" cy="18" r="8" fill="#ED1C27" />
      </svg>
    ),
    label: 'Manga',
  },
  Manhua: {
    svg: (
      <svg viewBox="0 0 36 36" className="w-full h-full">
        <circle cx="18" cy="18" r="16" fill="#DE2910" />
        <circle cx="13" cy="13" r="2.5" fill="#FFDE02" />
        <circle cx="18" cy="18" r="3" fill="#FFDE02" />
        <circle cx="10" cy="18" r="2" fill="#FFDE02" />
        <circle cx="13" cy="22" r="2" fill="#FFDE02" />
        <circle cx="18" cy="12" r="2" fill="#FFDE02" />
      </svg>
    ),
    label: 'Manhua',
  },
}

export default function TypeBadge({ type }: Props) {
  if (!type || !icons[type]) return null

  return (
    <span
      className="absolute z-1 top-1 left-1 w-6 h-6"
      title={icons[type].label}
    >
      {icons[type].svg}
    </span>
  )
}