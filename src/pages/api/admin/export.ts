import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const { mes } = req.query;
  const mesStr = String(mes ?? '');

  let rows: any[];

  if (/^\d{4}-\d{2}$/.test(mesStr)) {
    const [year, month] = mesStr.split('-');
    [rows] = await pool.query(
      `SELECT p.fecha, c.nombre, c.dni, p.monto, p.tipo, p.estado, p.mp_payment_id
       FROM pagos p
       JOIN clientes c ON c.idcliente = p.idcliente
       WHERE YEAR(p.fecha) = ? AND MONTH(p.fecha) = ?
       ORDER BY p.fecha DESC`,
      [year, month],
    ) as any;
  } else {
    [rows] = await pool.query(
      `SELECT p.fecha, c.nombre, c.dni, p.monto, p.tipo, p.estado, p.mp_payment_id
       FROM pagos p
       JOIN clientes c ON c.idcliente = p.idcliente
       WHERE YEAR(p.fecha) = YEAR(CURDATE()) AND MONTH(p.fecha) = MONTH(CURDATE())
       ORDER BY p.fecha DESC`,
    ) as any;
  }

  const header = 'Fecha,Cliente,DNI,Monto,Tipo,Estado,MP Payment ID\n';
  const csvRows = rows.map((r: any) => {
    const fecha = new Date(r.fecha).toLocaleDateString('es-AR');
    const nombre = `"${String(r.nombre).replace(/"/g, '""')}"`;
    return `${fecha},${nombre},${r.dni},${Number(r.monto).toFixed(2)},${r.tipo},${r.estado},${r.mp_payment_id ?? ''}`;
  });

  const filename = /^\d{4}-\d{2}$/.test(mesStr)
    ? `pagos-${mesStr}.csv`
    : `pagos-${new Date().toISOString().slice(0, 7)}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  // BOM para compatibilidad con Excel
  return res.status(200).send('﻿' + header + csvRows.join('\n'));
}
