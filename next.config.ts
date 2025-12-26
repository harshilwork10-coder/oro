import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Allow production builds to complete even with type errors
    ignoreBuildErrors: true,
  },

  // CEO DECISION: API Response Caching for Performance & Cost Savings
  async headers() {
    return [
      // Cache product/inventory data (60 seconds) - Most accessed, rarely changes
      {
        source: '/api/inventory/:path*',
        headers: [
          { key: 'Cache-Control', value: 's-maxage=60, stale-while-revalidate=120' }
        ]
      },
      // Cache category data (5 minutes) - Very stable data
      {
        source: '/api/inventory/categories',
        headers: [
          { key: 'Cache-Control', value: 's-maxage=300, stale-while-revalidate=600' }
        ]
      },
      // Cache top sellers/favorites (2 minutes)
      {
        source: '/api/pos/retail/top-sellers',
        headers: [
          { key: 'Cache-Control', value: 's-maxage=120, stale-while-revalidate=300' }
        ]
      },
      // Cache reports (1 minute) - Good balance of freshness
      {
        source: '/api/franchise/reports/:path*',
        headers: [
          { key: 'Cache-Control', value: 's-maxage=60, stale-while-revalidate=120' }
        ]
      },
      // NO CACHE for transactions, payments, auth (must be real-time)
      {
        source: '/api/pos/transaction/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' }
        ]
      },
      {
        source: '/api/auth/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' }
        ]
      }
    ]
  },
} satisfies NextConfig;

export default nextConfig;
