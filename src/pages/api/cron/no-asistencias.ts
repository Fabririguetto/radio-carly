import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = req.headers["x-cron-secret"];
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Clientes con horario para hoy cuya hora_fin ya pasó y no tienen sesión registrada
    const [pendientes] = await conn.query(
      `SELECT h.idhorario, h.idcliente
       FROM horarios h
       WHERE h.dia_semana = (
           CASE DAYOFWEEK(CURDATE())
             WHEN 1 THEN 7
             ELSE DAYOFWEEK(CURDATE()) - 1
           END
         )
         AND h.hora_fin < CURTIME()
         AND NOT EXISTS (
           SELECT 1 FROM sesiones s
           WHERE s.idhorario = h.idhorario
             AND s.idcliente = h.idcliente
             AND s.fecha = CURDATE()
         )`
    );

    const lista = pendientes as any[];
    if (lista.length === 0) {
      await conn.commit();
      return res.json({ ok: true, registrados: 0 });
    }

    const [configRows] = await conn.query("SELECT precio_reserva FROM config LIMIT 1");
    const { precio_reserva } = (configRows as any[])[0];

    for (const h of lista) {
      await conn.query(
        `INSERT INTO sesiones (idcliente, idhorario, fecha, asistio, monto)
         VALUES (?, ?, CURDATE(), 0, ?)
         ON DUPLICATE KEY UPDATE asistio = 0, monto = ?`,
        [h.idcliente, h.idhorario, precio_reserva, precio_reserva]
      );
      await conn.query(
        `UPDATE ctacte SET egreso = egreso + ?, balance = balance + ? WHERE idcliente = ?`,
        [precio_reserva, precio_reserva, h.idcliente]
      );
    }

    await conn.commit();
    console.log(`Cron no-asistencias: ${lista.length} registros creados`);
    res.json({ ok: true, registrados: lista.length });
  } catch (e: any) {
    await conn.rollback();
    console.error("Cron no-asistencias error:", e.message);
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
}
