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
        hostname: "komiklab.org",
      },
      {
        protocol: "https",
        hostname: "*.komiklab.org",
      },
      {
        protocol: "http",
        hostname: "cdnasu.xyz",
      },
      {
        protocol: "https",
        hostname: "cdnasu.xyz",
      },
      {
        protocol: "http",
        hostname: "*.cdnasu.xyz",
      },
      {
        protocol: "https",
        hostname: "*.cdnasu.xyz",
      },

    ],
  },
  env: {
    DOMAIN_KIRYUU: process.env.DOMAIN_KIRYUU,
    DOMAIN_KOMIK_H: process.env.DOMAIN_KOMIK_H || process.env['DOMAIN_KOMIK_H'],
  },
};

export default nextConfig;
