import type { NextConfig } from 'next';

const api = process.env.API_INTERNAL_URL || 'http://localhost:3001';
const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/aprovacao/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Cache-Control', value: 'no-store, private' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${api}/api/:path*` },
      { source: '/_blob/:path*', destination: `${api}/_blob/:path*` },
      { source: '/brand/:path*', destination: `${api}/brand/:path*` },
      { source: '/healthz', destination: `${api}/healthz` },
    ];
  },
};
export default nextConfig;
