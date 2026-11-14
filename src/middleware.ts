import { NextRequest, NextResponse } from 'next/server';

const ADMIN_COOKIE = 'admin_session';

// Endpoints bajo /api/admin/ que NO requieren sesión admin
const PUBLIC_ADMIN_PATHS = new Set([
  '/api/admin/auth',
  '/api/admin/migrar',
  '/api/admin/mp-connect-webhook',
  '/api/admin/mp-oauth-callback',
]);

// Rutas estrictamente restringidas para el rol OPERADOR (no tiene acceso a datos sensibles ni config)
const RESTRICTED_FOR_OPERATOR = [
  '/api/admin/facturacion',
  '/api/admin/stats',
  '/api/admin/export',
  '/api/admin/config',
  '/api/admin/precios/actualizacion-masiva',
  '/api/admin/mp-',
  '/api/admin/notificaciones',
];

async function verifyToken(token: string): Promise<{ valid: boolean; role: 'ADMIN' | 'OPERADOR' }> {
  try {
    const parts = token.split('.');
    const version = process.env.ADMIN_TOKEN_VERSION ?? '2';
    const base    = process.env.ADMIN_TOKEN_SECRET ?? process.env.ADMIN_PASSWORD;
    if (!base) return { valid: false, role: 'ADMIN' };
    const sec = `v${version}:${base}`;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(sec),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Token legado v1: expiresAt.sig
    if (parts.length === 2) {
      const [expiresAt, sig] = parts;
      const buf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(expiresAt));
      const expectedSig = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      if (sig.length !== expectedSig.length) return { valid: false, role: 'ADMIN' };
      let diff = 0;
      for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
      return { valid: diff === 0 && Date.now() < parseInt(expiresAt, 16), role: 'ADMIN' };
    }

    // Token v2: expiresAt.role.sig
    if (parts.length === 3) {
      const [expiresAt, roleStr, sig] = parts;
      const role = roleStr === 'OPERADOR' ? 'OPERADOR' : 'ADMIN';
      const payload = `${expiresAt}.${roleStr}`;
      const buf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
      const expectedSig = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      if (sig.length !== expectedSig.length) return { valid: false, role };
      let diff = 0;
      for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
      return { valid: diff === 0 && Date.now() < parseInt(expiresAt, 16), role };
    }

    return { valid: false, role: 'ADMIN' };
  } catch {
    return { valid: false, role: 'ADMIN' };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ADMIN_PATHS.has(pathname)) return NextResponse.next();

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { valid, role } = await verifyToken(token);
  if (!valid) {
    return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 });
  }

  // Control RBAC para el rol OPERADOR
  if (role === 'OPERADOR') {
    const isRestricted = RESTRICTED_FOR_OPERATOR.some((path) => pathname.startsWith(path));
    if (isRestricted) {
      return NextResponse.json(
        { error: 'Acceso denegado: El perfil Operador no tiene permisos para esta acción.' },
        { status: 403 }
      );
    }
  }

  // Inyectar el rol en los headers hacia los handlers de Next.js
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-role', role);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: '/api/admin/:path*',
};
