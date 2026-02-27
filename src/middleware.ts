import { NextRequest, NextResponse } from 'next/server';

const MC_API_TOKEN = process.env.MC_API_TOKEN;
if (!MC_API_TOKEN) {
  console.warn('[SECURITY WARNING] MC_API_TOKEN not set - API authentication is DISABLED (local dev mode)');
}

/**
 * Check if a request originates from the same host (browser UI).
 */
function isSameOriginRequest(request: NextRequest): boolean {
  const host = request.headers.get('host');
  if (!host) return false;

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  if (!origin && !referer) return false;

  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host === host) return true;
    } catch { /* invalid */ }
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.host === host) return true;
    } catch { /* invalid */ }
  }

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Auth disabled in dev mode
  if (!MC_API_TOKEN) {
    return NextResponse.next();
  }

  // Allow same-origin browser requests
  if (isSameOriginRequest(request)) {
    return NextResponse.next();
  }

  // SSE stream: allow token as query param
  if (pathname === '/api/events/stream') {
    const queryToken = request.nextUrl.searchParams.get('token');
    if (queryToken && queryToken === MC_API_TOKEN) {
      return NextResponse.next();
    }
  }

  // Check Bearer token
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.substring(7);
  if (token !== MC_API_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
