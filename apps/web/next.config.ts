import type { NextConfig } from 'next';

const api = process.env.API_INTERNAL_URL || 'http://localhost:3001';
const nextConfig: NextConfig = {
  output: 'standalone',
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
