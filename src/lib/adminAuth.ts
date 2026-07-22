import crypto from 'crypto';

export const ADMIN_COOKIE = 'admin_session';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

function secret(): string {
  return process.env.ADMIN_TOKEN_SECRET ?? process.env.ADMIN_PASSWORD!;
}

// Cambiar ADMIN_TOKEN_VERSION en Railway invalida todas las sesiones activas.
function tokenVersion(): string {
  return process.env.ADMIN_TOKEN_VERSION ?? "1";
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    const aBuf = Buffer.from(a, 'hex');
    const bBuf = Buffer.from(b, 'hex');
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

export function createAdminToken(): string {
  const version   = tokenVersion();
  const issuedAt  = Date.now().toString(16);
  const expiresAt = (Date.now() + SESSION_MS).toString(16);
  const payload   = `${version}.${issuedAt}.${expiresAt}`;
  const sig       = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const parts = token.split('.');

    if (parts.length === 4) {
      // Formato nuevo: version.issuedAt.expiresAt.sig
      const [version, , expiresAt, sig] = parts;
      if (version !== tokenVersion()) return false;
      const payload     = parts.slice(0, 3).join('.');
      const expectedSig = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
      if (!timingSafeEqual(sig, expectedSig)) return false;
      return Date.now() < parseInt(expiresAt, 16);
    }

    if (parts.length === 2) {
      // Formato legacy: expiresAt.sig — soportado durante la transición
      const [expiresAt, sig] = parts;
      const expectedSig = crypto.createHmac('sha256', secret()).update(expiresAt).digest('hex');
      if (!timingSafeEqual(sig, expectedSig)) return false;
      return Date.now() < parseInt(expiresAt, 16);
    }

    return false;
  } catch {
    return false;
  }
}
