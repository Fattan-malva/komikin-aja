import type { NextConfig } from "next";

// Gambar sudah lewat /api/proxy/image, tapi tetap didaftarkan agar aman kalau
// suatu saat ada komponen yang memakai next/image langsung.
const IMAGE_HOSTS = [
  "cdncid.csmcscns.id",
  "*.csmcscns.id",
  "*.dbm.my.id",
  "*.cosmicscans.to",
  "*.cosmicscans.asia",
  "*.gilakomik.id",
  "*.manhwadesu.wiki",
  "i0.wp.com",
  "i1.wp.com",
  "i2.wp.com",
  "i3.wp.com",
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: IMAGE_HOSTS.flatMap((hostname) => [
      { protocol: "https", hostname },
      { protocol: "http", hostname },
    ]),
  },
};

export default nextConfig;
