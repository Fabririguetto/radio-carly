import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminToken, ADMIN_COOKIE } from '@/lib/adminAuth';

function cookieHeader(value: string, maxAge: number): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${ADMIN_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', cookieHeader('', 0));
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') return res.status(405).end();

  const { dni, password } = req.body;

  if (dni !== process.env.MASTER_DNI) {
    return res.status(401).json({ error: 'DNI no autorizado' });
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  const token = createAdminToken();
  res.setHeader('Set-Cookie', cookieHeader(token, 30 * 24 * 60 * 60));
  return res.status(200).json({ ok: true });
}
