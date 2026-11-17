import { NextRequest, NextResponse } from 'next/server';

const api = process.env.API_INTERNAL_URL || 'http://127.0.0.1:3001';
type Session = { canEdit: boolean; mustChange: boolean };

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  let session: Session | null = null;
  try {
    const response = await fetch(`${api}/api/auth/me`, {
      headers: { cookie: request.headers.get('cookie') || '' },
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (response.ok) session = await response.json() as Session;
  } catch { /* Fail closed if API is unavailable. */ }
  if (path === '/login') {
    if (session && !session.mustChange) return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.next();
  }
  if (!session) return NextResponse.redirect(new URL('/login', request.url));
  if (session.mustChange) return NextResponse.redirect(new URL('/login?trocar=1', request.url));
  if (path === '/admin' && !session.canEdit) return NextResponse.redirect(new URL('/', request.url));
  return NextResponse.next();
}

export const config = { matcher: ['/', '/login', '/admin'] };
