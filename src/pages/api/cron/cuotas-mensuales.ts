import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = req.headers["x-cron-secret"];
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const ciclo = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const motivoCuota = `Cuota mensual ${ciclo}`;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Seleccionar clientes activos con mes adelantado y monto mensual válido
    const [clientes] = await conn.query(
      `SELECT idcliente, monto_mensual, nombre
       FROM clientes
       WHERE activo = 1
         AND tipo_cobro = 'MES_ADELANTADO'
         AND monto_mensual > 0
       FOR UPDATE`
    );

    let imputados = 0;
    const lista = clientes as any[];

    for (const c of lista) {
      // Verificar si ya se imputó la cuota de este ciclo
      const [yaImputado] = await conn.query(
        `SELECT idpago FROM pagos WHERE idcliente = ? AND motivo = ? LIMIT 1`,
        [c.idcliente, motivoCuota]
      );

      if ((yaImputado as any[]).length === 0) {
        const monto = Number(c.monto_mensual);
        await conn.query(
          `INSERT INTO pagos (idcliente, monto, estado, tipo, motivo)
           VALUES (?, ?, 'pendiente', 'manual', ?)`,
          [c.idcliente, monto, motivoCuota]
        );
        await conn.query(
          `UPDATE ctacte
           SET egreso = egreso + ?,
               balance = balance + ?
           WHERE idcliente = ?`,
          [monto, monto, c.idcliente]
        );
        imputados++;
      }
    }

    await conn.commit();
    return res.status(200).json({ ok: true, ciclo, cuotasImputadas: imputados });
  } catch (err: any) {
    await conn.rollback();
    return res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}
