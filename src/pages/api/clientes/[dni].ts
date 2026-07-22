import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { rateLimit } from '@/lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    req.socket.remoteAddress ??
    'unknown';

  if (!await rateLimit(ip, 15, 60_000)) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Esperá un momento.' });
  }

  const { dni } = req.query as { dni: string };

  const [rows] = await pool.query(
    `SELECT c.idcliente, c.dni, c.nombre,
            COALESCE(ct.balance, 0) AS balance
     FROM clientes c
     LEFT JOIN ctacte ct ON ct.idcliente = c.idcliente
     WHERE c.dni = ? AND c.activo = 1`,
    [dni],
  );

  const clientes = rows as any[];
  if (clientes.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

  res.status(200).json(clientes[0]);
}
