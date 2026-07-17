import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { idcliente, idhorario, asistio } = req.body;
  if (!idcliente || !idhorario || asistio === undefined) {
    return res.status(400).json({ error: "idcliente, idhorario y asistio son requeridos" });
  }

  const [configRows] = await pool.query("SELECT precio_hora, precio_reserva FROM config LIMIT 1");
  const config = (configRows as any[])[0];
  const monto = asistio ? config.precio_hora : config.precio_reserva;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Crear o actualizar la sesión del día
    await conn.query(
      `INSERT INTO sesiones (idcliente, idhorario, fecha, asistio, monto)
       VALUES (?, ?, CURDATE(), ?, ?)
       ON DUPLICATE KEY UPDATE asistio = VALUES(asistio), monto = VALUES(monto)`,
      [idcliente, idhorario, asistio ? 1 : 0, monto]
    );

    // Sumar el monto al egreso y balance de la cuenta corriente
    await conn.query(
      `UPDATE ctacte
       SET egreso  = egreso + ?,
           balance = balance + ?
       WHERE idcliente = ?`,
      [monto, monto, idcliente]
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
