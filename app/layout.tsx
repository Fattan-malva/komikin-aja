import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/src/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.SITE_URL || "https://komikin-aja.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "KomikinAja - Baca Komik Bahasa Indonesia",
    template: "%s - KomikinAja",
  },
  description:
    "Baca komik, manhwa, manga, dan manhua Bahasa Indonesia. Update chapter terbaru setiap hari.",
  applicationName: "KomikinAja",
  manifest: "/manifest.webmanifest",

  // Agar saat dibuka dari Home Screen iOS berjalan fullscreen seperti app,
  // bukan di dalam browser Safari.
  appleWebApp: {
    capable: true,
    title: "KomikinAja",
    // Latar app gelap, jadi teks status bar dibuat putih.
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },

  // PENTING - workaround bug Next.js 16 canary.
  // `appleWebApp.capable` hanya menghasilkan meta `mobile-web-app-capable`
  // (tanpa awalan `apple-`) sehingga tidak dikenali iOS. Tanpa tag di bawah
  // ini, "Add to Home Screen" TIDAK akan membuka situs sebagai web app.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },

  // app/icon.png dan app/apple-icon.png Next suntikkan otomatis lewat file
  // convention, tapi apple-touch-icon ditulis eksplisit supaya urutan tagnya
  // pasti benar di Safari.
  icons: {
    icon: [
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },

  openGraph: {
    type: "website",
    siteName: "KomikinAja",
    locale: "id_ID",
    url: siteUrl,
    title: "KomikinAja - Baca Komik Bahasa Indonesia",
    description: "Baca komik, manhwa, manga, dan manhua Bahasa Indonesia.",
  },
  twitter: {
    card: "summary_large_image",
    title: "KomikinAja",
    description: "Baca komik, manhwa, manga, dan manhua Bahasa Indonesia.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Wajib untuk mode standalone: tanpa ini konten tertutup notch di iPhone dan
  // tertimpa home indicator di bagian bawah.
  viewportFit: "cover",
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen flex flex-col antialiased">
        <Header />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
        <footer className="border-t border-white/5 py-6 text-center text-sm text-gray-500">
          <p>KomikinAja &copy; {new Date().getFullYear()} - Baca Manga Bahasa Indonesia</p>
        </footer>
      </body>
    </html>
  );
}