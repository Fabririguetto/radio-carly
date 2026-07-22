import { NextRequest, NextResponse } from 'next/server';

const ADMIN_COOKIE = 'admin_session';

// Endpoints bajo /api/admin/ que NO requieren sesión admin
const PUBLIC_ADMIN_PATHS = new Set([
  '/api/admin/auth',
  '/api/admin/mp-connect-webhook',
  '/api/admin/mp-oauth-callback',
]);

async function verifyToken(token: string): Promise<boolean> {
  try {
    const dot = token.indexOf('.');
    if (dot < 0) return false;
    const expiresAt = token.slice(0, dot);
    const sig = token.slice(dot + 1);

    const sec = process.env.ADMIN_TOKEN_SECRET ?? process.env.ADMIN_PASSWORD;
    if (!sec) return false;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(sec),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const buf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(expiresAt));
    const expectedSig = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (sig.length !== expectedSig.length) return false;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    if (diff !== 0) return false;

    return Date.now() < parseInt(expiresAt, 16);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ADMIN_PATHS.has(pathname)) return NextResponse.next();

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/admin/:path*',
};
