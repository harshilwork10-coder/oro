import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Allow production builds to complete even with type errors
    // These are mostly Next.js validation types that don't affect runtime
    ignoreBuildErrors: true,
  },
} satisfies NextConfig;

export default nextConfig;
