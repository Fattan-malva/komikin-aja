import type { MetadataRoute } from "next";

/**
 * Web app manifest untuk "Add to Home Screen".
 *
 * iOS Safari membaca apple-touch-icon dari metadata (lihat app/layout.tsx),
 * bukan dari manifest. Manifest ini yang dipakai Android/Chrome dan yang
 * memberi nama serta warna status bar saat dibuka sebagai app.
 *
 * Catatan ikon: iOS TIDAK Gunnduk ikon bertransparent. Semua file sudah di-
 * flatten ke warna background situs (#0a0a0f) sebelum ditulis.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KomikinAja - Baca Komik Bahasa Indonesia",
    short_name: "KomikinAja",
    description:
      "Baca komik, manhwa, manga, dan manhua Bahasa Indonesia. Update chapter terbaru setiap hari.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0f",
    theme_color: "#0a0a0f",
    lang: "id",
    dir: "ltr",
    categories: ["books", "entertainment"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // Android memotong jadi lingkaran/bervarious bentuk, jadi butuh
        // varian dengan lebih banyak padding.
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}