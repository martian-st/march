import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ['lh3.googleusercontent.com', "fonts.gstatic.com", "avatars.githubusercontent.com"]
  },
  // Disable type checking during production build for faster builds
  typescript: {
    // !! WARN !! Only do this if you're confident in your types
    ignoreBuildErrors: true,
  },
  // Ignore ESLint errors during production build
  eslint: {
    // !! WARN !! Only do this if you're confident in your code quality
    ignoreDuringBuilds: true,
  },
  // Disable strict mode for development
  reactStrictMode: false,
};

export default nextConfig;
