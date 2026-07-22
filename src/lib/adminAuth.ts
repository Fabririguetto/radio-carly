import crypto from 'crypto';

export const ADMIN_COOKIE = 'admin_session';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

// Para revocar todas las sesiones activas: cambiar ADMIN_TOKEN_VERSION en Railway.
// El cambio de versión altera el secreto HMAC, invalidando todos los tokens existentes.
function secret(): string {
  const version = process.env.ADMIN_TOKEN_VERSION ?? '1';
  const base    = process.env.ADMIN_TOKEN_SECRET ?? process.env.ADMIN_PASSWORD!;
  return `v${version}:${base}`;
}

export function createAdminToken(): string {
  const expiresAt = (Date.now() + SESSION_MS).toString(16);
  const sig = crypto.createHmac('sha256', secret()).update(expiresAt).digest('hex');
  return `${expiresAt}.${sig}`;
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const dot = token.indexOf('.');
    if (dot < 0) return false;
    const expiresAt  = token.slice(0, dot);
    const sig        = token.slice(dot + 1);
    const expectedSig = crypto.createHmac('sha256', secret()).update(expiresAt).digest('hex');
    if (sig.length !== expectedSig.length) return false;
    const sigBuf      = Buffer.from(sig, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expectedBuf.length) return false;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;
    return Date.now() < parseInt(expiresAt, 16);
  } catch {
    return false;
  }
}
