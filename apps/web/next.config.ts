import type { NextConfig } from 'next';
import fs from 'node:fs';
import path from 'node:path';

// pnpm builds apps/web with this as cwd, while .env lives at the monorepo root.
// Rewrite destinations are serialized at build time, before the PM2 environment is applied.
const rootEnvPath = path.resolve(process.cwd(), '../../.env');
const rootEnv: Record<string,string> = {};
if (fs.existsSync(rootEnvPath)) {
  for (const line of fs.readFileSync(rootEnvPath,'utf8').split(/\\r?\\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*(.*)$/);
    if (!match) continue;
    rootEnv[match[1]] = match[2].trim().replace(/^(['"])(.*)\\1$/, '$2');
  }
}
const api = process.env.API_INTERNAL_URL || rootEnv.API_INTERNAL_URL ||
  `http://127.0.0.1:${process.env.API_PORT || rootEnv.API_PORT || '4003'}`;

const nextConfig: NextConfig = {
  async headers() {
    return [
      // The CRM HTML is generated at startup; never reuse a prior branch's static page.
      ...['/', '/index.html', '/legacy/index.html'].map((source) => ({
        source,
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      })),
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
