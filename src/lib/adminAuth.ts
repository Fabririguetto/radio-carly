import crypto from 'crypto';

export type Rol = 'ADMIN' | 'OPERADOR';
export const ADMIN_COOKIE = 'admin_session';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

// Para revocar todas las sesiones activas: cambiar ADMIN_TOKEN_VERSION en Railway.
// El cambio de versión altera el secreto HMAC, invalidando todos los tokens existentes.
function secret(): string {
  const version = process.env.ADMIN_TOKEN_VERSION ?? '2';
  const base    = process.env.ADMIN_TOKEN_SECRET ?? process.env.ADMIN_PASSWORD!;
  return `v${version}:${base}`;
}

export function createAdminToken(role: Rol = 'ADMIN'): string {
  const expiresAt = (Date.now() + SESSION_MS).toString(16);
  const payload   = `${expiresAt}.${role}`;
  const sig       = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyAdminToken(token: string | undefined): { valid: boolean; role: Rol } {
  if (!token) return { valid: false, role: 'ADMIN' };
  try {
    const parts = token.split('.');
    if (parts.length === 2) {
      // Token v1 (legado): expiresAt.sig (asume ADMIN)
      const [expiresAt, sig] = parts;
      const expectedSig = crypto.createHmac('sha256', secret()).update(expiresAt).digest('hex');
      if (sig.length !== expectedSig.length) return { valid: false, role: 'ADMIN' };
      const sigBuf      = Buffer.from(sig, 'hex');
      const expectedBuf = Buffer.from(expectedSig, 'hex');
      if (sigBuf.length !== expectedBuf.length) return { valid: false, role: 'ADMIN' };
      if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return { valid: false, role: 'ADMIN' };
      return { valid: Date.now() < parseInt(expiresAt, 16), role: 'ADMIN' };
    }

    if (parts.length === 3) {
      // Token v2: expiresAt.role.sig
      const [expiresAt, roleStr, sig] = parts;
      const role: Rol = roleStr === 'OPERADOR' ? 'OPERADOR' : 'ADMIN';
      const payload   = `${expiresAt}.${roleStr}`;
      const expectedSig = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
      if (sig.length !== expectedSig.length) return { valid: false, role };
      const sigBuf      = Buffer.from(sig, 'hex');
      const expectedBuf = Buffer.from(expectedSig, 'hex');
      if (sigBuf.length !== expectedBuf.length) return { valid: false, role };
      if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return { valid: false, role };
      return { valid: Date.now() < parseInt(expiresAt, 16), role };
    }

    return { valid: false, role: 'ADMIN' };
  } catch {
    return { valid: false, role: 'ADMIN' };
  }
}
