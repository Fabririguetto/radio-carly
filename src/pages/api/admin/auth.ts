import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { createAdminToken, ADMIN_COOKIE, Rol } from '@/lib/adminAuth';

function cookieHeader(value: string, maxAge: number): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${ADMIN_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', cookieHeader('', 0));
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') return res.status(405).end();

  const { dni, password } = req.body;
  const dniIngresado = String(dni ?? '').trim();
  const passIngresada = String(password ?? '').trim();

  // Obtener credenciales de operador desde DB si existen
  const [cfgRows] = await pool.query('SELECT operador_dni, operador_password FROM config LIMIT 1');
  const cfg = (cfgRows as any[])[0];

  const adminDni = process.env.MASTER_DNI;
  const adminPass = process.env.ADMIN_PASSWORD;

  const operadorDni = process.env.OPERATOR_DNI || cfg?.operador_dni;
  const operadorPass = process.env.OPERATOR_PASSWORD || cfg?.operador_password;

  let rolAutenticado: Rol | null = null;

  if (adminDni && dniIngresado === adminDni) {
    if (!passIngresada || passIngresada !== adminPass) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    rolAutenticado = 'ADMIN';
  } else if (operadorDni && dniIngresado === operadorDni) {
    if (!passIngresada || passIngresada !== operadorPass) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    rolAutenticado = 'OPERADOR';
  } else {
    return res.status(401).json({ error: 'DNI no autorizado' });
  }

  const token = createAdminToken(rolAutenticado);
  res.setHeader('Set-Cookie', cookieHeader(token, 30 * 24 * 60 * 60));
  return res.status(200).json({ ok: true, role: rolAutenticado });
}
