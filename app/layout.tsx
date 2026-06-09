'use client'

import { Geist, Geist_Mono } from "next/font/google"
import { usePathname } from "next/navigation"
import "./globals.css"
import Header from "@/src/components/Header"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export default function RootLayoutWrapper({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = usePathname()
  const isReaderPage = pathname?.startsWith('/baca/')

  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen flex flex-col antialiased">
        {!isReaderPage && <Header />}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
        <footer className="border-t border-white/5 py-6 text-center text-sm text-gray-500">
          <p>KomikinAja &copy; {new Date().getFullYear()} - Baca Manga Bahasa Indonesia</p>
        </footer>
      </body>
    </html>
  )
}