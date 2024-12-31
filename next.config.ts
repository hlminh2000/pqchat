import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['websocket'],
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === "production", // there's an incompatibility between Next.js 15 and @auth0/nextjs-auth0
  }
};

export default nextConfig;
