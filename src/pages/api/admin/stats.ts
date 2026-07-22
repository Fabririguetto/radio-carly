import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const desde = String(req.query.desde ?? hoy());
  const hasta = String(req.query.hasta ?? desde);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    return res.status(400).json({ error: 'Formato de fecha inválido (YYYY-MM-DD)' });
  }

  const [[cobrado], [sesiones], deudores] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(monto), 0) AS total
       FROM pagos
       WHERE estado = 'aprobado' AND tipo IN ('qr','manual') AND DATE(fecha) BETWEEN ? AND ?`,
      [desde, hasta],
    ),
    pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(asistio = 1) AS asistieron,
         SUM(asistio = 0) AS no_asistieron
       FROM sesiones
       WHERE fecha BETWEEN ? AND ?`,
      [desde, hasta],
    ),
    pool.query(
      `SELECT c.nombre, c.dni, ct.balance
       FROM clientes c JOIN ctacte ct ON ct.idcliente = c.idcliente
       WHERE ct.balance > 0
       ORDER BY ct.balance DESC
       LIMIT 10`,
    ),
  ]) as any;

  return res.status(200).json({
    cobrado: Number((cobrado as any[])[0].total),
    sesiones: {
      total:         Number((sesiones as any[])[0].total),
      asistieron:    Number((sesiones as any[])[0].asistieron    ?? 0),
      no_asistieron: Number((sesiones as any[])[0].no_asistieron ?? 0),
    },
    deudores: (deudores as any[][])[0],
  });
}
