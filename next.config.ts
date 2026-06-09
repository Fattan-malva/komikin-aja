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
    ],
  },
  env: {
    DOMAIN_KIRYUU: process.env.DOMAIN_KIRYUU,
  },
};

export default nextConfig;
