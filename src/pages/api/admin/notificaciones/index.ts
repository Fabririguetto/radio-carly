import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const [notifs] = await pool.query(
        `SELECT n.idnotificacion, n.titulo, n.texto, n.tipo, n.precio_nuevo,
                n.fecha_inicio, n.fecha_expiracion, n.para_todos, n.creada_at,
                COUNT(nc.idcliente) AS destinatarios
         FROM notificaciones n
         LEFT JOIN notificaciones_clientes nc ON nc.idnotificacion = n.idnotificacion
         GROUP BY n.idnotificacion, n.titulo, n.texto, n.tipo, n.precio_nuevo,
                  n.fecha_inicio, n.fecha_expiracion, n.para_todos, n.creada_at
         ORDER BY n.creada_at DESC`,
      );
      return res.status(200).json(notifs);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === "POST") {
    const { titulo, texto, tipo, precio_nuevo, fecha_inicio, fecha_expiracion, para_todos, clientes } = req.body;
    if (!titulo || !texto || !fecha_inicio || !fecha_expiracion) {
      return res.status(400).json({ error: "titulo, texto, fecha_inicio y fecha_expiracion son requeridos" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result]: any = await conn.query(
        `INSERT INTO notificaciones (titulo, texto, tipo, precio_nuevo, fecha_inicio, fecha_expiracion, para_todos)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          titulo.trim(),
          texto.trim(),
          tipo ?? "general",
          precio_nuevo ? Number(precio_nuevo) : null,
          fecha_inicio,
          fecha_expiracion,
          para_todos ? 1 : 0,
        ],
      );
      const idnotificacion = result.insertId;

      if (para_todos) {
        await conn.query(
          `INSERT INTO notificaciones_clientes (idnotificacion, idcliente)
           SELECT ?, idcliente FROM clientes WHERE activo = 1`,
          [idnotificacion],
        );
      } else if (Array.isArray(clientes) && clientes.length > 0) {
        for (const idcliente of clientes) {
          await conn.query(
            "INSERT IGNORE INTO notificaciones_clientes (idnotificacion, idcliente) VALUES (?, ?)",
            [idnotificacion, idcliente],
          );
        }
      }

      await conn.commit();
      return res.status(201).json({ ok: true, idnotificacion });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  if (req.method === "DELETE") {
    const { idnotificacion } = req.body;
    if (!idnotificacion) return res.status(400).json({ error: "idnotificacion requerido" });
    await pool.query("DELETE FROM notificaciones WHERE idnotificacion = ?", [idnotificacion]);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
