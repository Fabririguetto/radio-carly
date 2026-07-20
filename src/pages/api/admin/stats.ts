import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const [
    [cobradoHoy],
    [cobradoSemana],
    [cobradoMes],
    [sesionesHoy],
    deudores,
  ] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(monto), 0) AS total
       FROM pagos WHERE estado = 'aprobado' AND DATE(fecha) = CURDATE()`,
    ),
    pool.query(
      `SELECT COALESCE(SUM(monto), 0) AS total
       FROM pagos WHERE estado = 'aprobado'
         AND YEARWEEK(fecha, 1) = YEARWEEK(CURDATE(), 1)`,
    ),
    pool.query(
      `SELECT COALESCE(SUM(monto), 0) AS total
       FROM pagos WHERE estado = 'aprobado'
         AND YEAR(fecha) = YEAR(CURDATE()) AND MONTH(fecha) = MONTH(CURDATE())`,
    ),
    pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(asistio = 1) AS asistieron,
         SUM(asistio = 0) AS no_asistieron
       FROM sesiones WHERE fecha = CURDATE()`,
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
    cobrado: {
      hoy:    Number((cobradoHoy as any[])[0].total),
      semana: Number((cobradoSemana as any[])[0].total),
      mes:    Number((cobradoMes as any[])[0].total),
    },
    sesiones: {
      total:          Number((sesionesHoy as any[])[0].total),
      asistieron:     Number((sesionesHoy as any[])[0].asistieron ?? 0),
      no_asistieron:  Number((sesionesHoy as any[])[0].no_asistieron ?? 0),
    },
    deudores: deudores[0] as any[],
  });
}
