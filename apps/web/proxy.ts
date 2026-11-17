import { NextRequest, NextResponse } from 'next/server';

const api = process.env.API_INTERNAL_URL || 'http://127.0.0.1:3001';
type Session = { canEdit: boolean; mustChange: boolean };

/**
 * The original UI is rendered from generated static HTML, but NEVER exposed
 * without the same authentication/role gate as the React routes.
 * /legacy/login.html is the only public page. The API remains authoritative.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // The login document must remain reachable when the user is not authenticated,
  // including when the /login rewrite is processed a second time.
  if (path === '/legacy/login.html') return NextResponse.next();

  let session: Session | null = null;
  try {
    const response = await fetch(`${api}/api/auth/me`, {
      headers: { cookie: request.headers.get('cookie') || '' },
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (response.ok) session = await response.json() as Session;
  } catch {
    // Fail closed while the API is unavailable.
  }

  if (path === '/login') {
    if (session && !session.mustChange) return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.rewrite(new URL('/legacy/login.html', request.url));
  }
  if (!session) return NextResponse.redirect(new URL('/login', request.url));
  if (session.mustChange) return NextResponse.redirect(new URL('/login?trocar=1', request.url));

  if ((path === '/admin' || path === '/legacy/admin.html') && !session.canEdit) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (path === '/admin') return NextResponse.rewrite(new URL('/legacy/admin.html', request.url));
  if (path === '/' || path === '/index.html') {
    return NextResponse.rewrite(new URL('/legacy/index.html', request.url));
  }

  // Direct requests for /legacy/index.html and /legacy/admin.html were gated
  // above, rather than being exposed as unauthenticated static assets.
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/index.html', '/login', '/admin', '/legacy/:path*'],
};
