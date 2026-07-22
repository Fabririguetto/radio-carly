import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const { idcliente } = req.query;
    if (!idcliente) return res.status(400).json({ error: "idcliente requerido" });

    const hoy = new Date().toISOString().slice(0, 10);

    const [rows] = await pool.query(
      `SELECT n.idnotificacion, n.titulo, n.texto, n.tipo, n.precio_nuevo
       FROM notificaciones n
       JOIN notificaciones_clientes nc ON nc.idnotificacion = n.idnotificacion
       WHERE nc.idcliente = ?
         AND n.fecha_inicio <= ?
         AND n.fecha_expiracion >= ?
       ORDER BY n.creada_at ASC
       LIMIT 1`,
      [idcliente, hoy, hoy],
    );

    const notif = (rows as any[])[0] ?? null;
    return res.status(200).json({ notif });
  }

  if (req.method === "POST") {
    // Marcar como aceptada
    const { idnotificacion, idcliente } = req.body;
    if (!idnotificacion || !idcliente) {
      return res.status(400).json({ error: "idnotificacion e idcliente son requeridos" });
    }
    await pool.query(
      `UPDATE notificaciones_clientes SET aceptada = 1, fecha_aceptacion = NOW()
       WHERE idnotificacion = ? AND idcliente = ?`,
      [idnotificacion, idcliente],
    );
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
