import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.kiryuu.to",
      },
      {
        protocol: "https",
        hostname: "yuucdn.com",
      },
      {
        protocol: "https",
        hostname: "*.yuucdn.com",
      },
      {
        protocol: "https",
        hostname: "blogger.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "komikremaja.art",
      },
      {
        protocol: "https",
        hostname: "*.komikremaja.art",
      },
      {
        protocol: "http",
        hostname: "warungkomikcdn.icu",
      },
      {
        protocol: "https",
        hostname: "warungkomikcdn.icu",
      },
      {
        protocol: "http",
        hostname: "*.warungkomikcdn.icu",
      },
      {
        protocol: "https",
        hostname: "*.warungkomikcdn.icu",
      },
      {
        protocol: "https",
        hostname: "i0.wp.com",
      },
      {
        protocol: "https",
        hostname: "i1.wp.com",
      },
      {
        protocol: "https",
        hostname: "i2.wp.com",
      },

    ],
  },
  env: {
    DOMAIN_KIRYUU: process.env.DOMAIN_KIRYUU,
    DOMAIN_KOMIK_H: process.env.DOMAIN_KOMIK_H || process.env['DOMAIN_KOMIK_H'],
    CF_COOKIE_H: process.env.CF_COOKIE_H || process.env['CF_COOKIE_H'],
  },
};

export default nextConfig;
