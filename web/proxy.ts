import { NextRequest, NextResponse } from 'next/server';

const api = process.env.API_INTERNAL_URL || 'http://localhost:3001';

async function currentUser(request: NextRequest) {
  const response = await fetch(`${api}/api/auth/me`, { headers: { cookie: request.headers.get('cookie') || '' }, cache: 'no-store' });
  if (!response.ok) return null;
  return response.json() as Promise<{ canEdit: boolean; mustChange: boolean }>;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // Rewrites de /, /login e /admin passam novamente pelo proxy no Next em produção.
  // Deixe os arquivos internos seguirem para evitar um loop de redirecionamento.
  if (path.startsWith('/legacy/')) return NextResponse.next();
  if (path === '/login') return NextResponse.rewrite(new URL('/legacy/login.html', request.url));
  const user = await currentUser(request).catch(() => null);
  if (!user) return NextResponse.redirect(new URL('/login', request.url));
  if (user.mustChange) return NextResponse.redirect(new URL('/login?trocar=1', request.url));
  if (path === '/admin' && !user.canEdit) return NextResponse.redirect(new URL('/', request.url));
  if (path === '/admin') return NextResponse.rewrite(new URL('/legacy/admin.html', request.url));
  if (path === '/' || path === '/index.html') return NextResponse.rewrite(new URL('/legacy/index.html', request.url));
  return NextResponse.next();
}

export const config = { matcher: ['/', '/index.html', '/login', '/admin', '/legacy/:path*'] };
