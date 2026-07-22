import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { getPrecioCliente } from '@/lib/precios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { idcliente, idhorario, asistio } = req.body;
  if (!idcliente || !idhorario || asistio === undefined) {
    return res.status(400).json({ error: 'idcliente, idhorario y asistio son requeridos' });
  }

  const [configRows] = await pool.query(
    'SELECT deuda_maxima FROM config LIMIT 1',
  );
  const config = (configRows as any[])[0];

  const hoy = new Date().toISOString().slice(0, 10);
  const precios = await getPrecioCliente(Number(idcliente), hoy);
  const monto = asistio ? precios.precio_hora : precios.precio_reserva;

  // Verificar límite de deuda antes de registrar la sesión
  const deudaMaxima = Number(config?.deuda_maxima ?? 0);
  if (deudaMaxima > 0) {
    const [ctRows] = await pool.query(
      'SELECT balance FROM ctacte WHERE idcliente = ?',
      [idcliente],
    );
    const balance = Number((ctRows as any[])[0]?.balance ?? 0);
    if (balance >= deudaMaxima) {
      return res.status(403).json({
        error: 'deuda_maxima',
        mensaje: `Tenés una deuda de $${balance.toLocaleString('es-AR')} que supera el límite permitido. Pagá antes de continuar.`,
      });
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO sesiones (idcliente, idhorario, fecha, asistio, monto)
       VALUES (?, ?, CURDATE(), ?, ?)
       ON DUPLICATE KEY UPDATE asistio = VALUES(asistio), monto = VALUES(monto)`,
      [idcliente, idhorario, asistio ? 1 : 0, monto],
    );

    await conn.query(
      `UPDATE ctacte
       SET egreso  = egreso + ?,
           balance = balance + ?
       WHERE idcliente = ?`,
      [monto, monto, idcliente],
    );

    await conn.commit();
    res.status(201).json({ monto });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
