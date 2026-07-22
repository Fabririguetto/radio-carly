import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";
import { getPrecioCliente } from "@/lib/precios";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = req.headers["x-cron-secret"];
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Programas activos con horario para hoy cuya hora_fin ya pasó y no tienen sesión registrada
    const [pendientes] = await conn.query(
      `SELECT ph.idprograma_horario, p.idcliente
       FROM programas p
       JOIN programas_horarios ph ON ph.idprograma = p.idprograma
       WHERE p.activo = 1
         AND p.fecha_inicio <= CURDATE()
         AND (p.fecha_fin IS NULL OR p.fecha_fin >= CURDATE())
         AND ph.dia_semana = (
           CASE DAYOFWEEK(CURDATE())
             WHEN 1 THEN 7
             ELSE DAYOFWEEK(CURDATE()) - 1
           END
         )
         AND ph.hora_fin < CURTIME()
         AND NOT EXISTS (
           SELECT 1 FROM sesiones s
           WHERE s.idprograma_horario = ph.idprograma_horario
             AND s.fecha = CURDATE()
         )`
    );

    const lista = pendientes as any[];
    if (lista.length === 0) {
      await conn.commit();
      return res.json({ ok: true, registrados: 0 });
    }

    const hoy = new Date().toISOString().slice(0, 10);

    for (const h of lista) {
      const precios = await getPrecioCliente(h.idcliente, hoy);
      const precio_reserva = precios.precio_reserva;

      const [result] = await conn.query(
        `INSERT INTO sesiones (idcliente, idprograma_horario, fecha, asistio, monto)
         VALUES (?, ?, CURDATE(), 0, ?)
         ON DUPLICATE KEY UPDATE asistio = 0, monto = ?`,
        [h.idcliente, h.idprograma_horario, precio_reserva, precio_reserva]
      );
      // affectedRows = 1 → inserción nueva; 2 → ya existía (ON DUPLICATE KEY)
      if ((result as any).affectedRows === 1) {
        await conn.query(
          `UPDATE ctacte SET egreso = egreso + ?, balance = balance + ? WHERE idcliente = ?`,
          [precio_reserva, precio_reserva, h.idcliente]
        );
      }
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
