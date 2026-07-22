import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const idcliente = Number(id);

  if (req.method === "GET") {
    try {
      const [historial] = await pool.query(
        `SELECT idhistorial, precio_hora, precio_reserva, fecha_desde, fecha_hasta
         FROM precios_historial
         WHERE idcliente = ?
         ORDER BY fecha_desde DESC`,
        [idcliente],
      );

      const [configRows] = await pool.query(
        "SELECT precio_hora, precio_reserva FROM config LIMIT 1",
      );

      return res.status(200).json({
        historial,
        global: (configRows as any[])[0],
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === "POST") {
    const { precio_hora, precio_reserva, fecha_desde } = req.body;
    if (!precio_hora || !precio_reserva || !fecha_desde) {
      return res.status(400).json({ error: "precio_hora, precio_reserva y fecha_desde son requeridos" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_desde)) {
      return res.status(400).json({ error: "Formato de fecha inválido (YYYY-MM-DD)" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Buscar el registro que cubre o viene antes de fecha_desde
      const [anteriorRows] = await conn.query(
        `SELECT idhistorial, fecha_desde FROM precios_historial
         WHERE idcliente = ? AND fecha_desde < ?
         ORDER BY fecha_desde DESC LIMIT 1`,
        [idcliente, fecha_desde],
      );
      const anterior = (anteriorRows as any[])[0];

      if (anterior) {
        // Cerrar el registro anterior con fecha_hasta = fecha_desde - 1 día
        await conn.query(
          `UPDATE precios_historial
           SET fecha_hasta = DATE_SUB(?, INTERVAL 1 DAY)
           WHERE idhistorial = ?`,
          [fecha_desde, anterior.idhistorial],
        );
      }

      // Buscar si existe un registro siguiente (para asignar fecha_hasta al nuevo)
      const [siguienteRows] = await conn.query(
        `SELECT fecha_desde FROM precios_historial
         WHERE idcliente = ? AND fecha_desde > ?
         ORDER BY fecha_desde ASC LIMIT 1`,
        [idcliente, fecha_desde],
      );
      const siguiente = (siguienteRows as any[])[0];

      const nuevaFechaHasta = siguiente
        ? siguiente.fecha_desde  // Se calculará como DATE_SUB abajo
        : null;

      await conn.query(
        `INSERT INTO precios_historial (idcliente, precio_hora, precio_reserva, fecha_desde, fecha_hasta)
         VALUES (?, ?, ?, ?, IF(? IS NULL, NULL, DATE_SUB(?, INTERVAL 1 DAY)))`,
        [
          idcliente,
          Number(precio_hora),
          Number(precio_reserva),
          fecha_desde,
          nuevaFechaHasta,
          nuevaFechaHasta,
        ],
      );

      await conn.commit();
      return res.status(201).json({ ok: true });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  // DELETE: elimina un precio futuro y corrige la cadena
  if (req.method === "DELETE") {
    const { idhistorial } = req.body;
    if (!idhistorial) return res.status(400).json({ error: "idhistorial requerido" });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.query(
        "SELECT fecha_desde, fecha_hasta FROM precios_historial WHERE idhistorial = ? AND idcliente = ?",
        [idhistorial, idcliente],
      );
      const registro = (rows as any[])[0];
      if (!registro) {
        await conn.rollback();
        return res.status(404).json({ error: "Registro no encontrado" });
      }

      const hoy = new Date().toISOString().slice(0, 10);
      if (registro.fecha_desde <= hoy) {
        await conn.rollback();
        return res.status(400).json({ error: "No se puede eliminar un precio ya vigente" });
      }

      // Encontrar el registro anterior y reasignarle fecha_hasta
      const [anteriorRows] = await conn.query(
        `SELECT idhistorial FROM precios_historial
         WHERE idcliente = ? AND fecha_desde < ?
         ORDER BY fecha_desde DESC LIMIT 1`,
        [idcliente, registro.fecha_desde],
      );
      const anterior = (anteriorRows as any[])[0];

      if (anterior) {
        await conn.query(
          "UPDATE precios_historial SET fecha_hasta = ? WHERE idhistorial = ?",
          [registro.fecha_hasta, anterior.idhistorial],
        );
      }

      await conn.query(
        "DELETE FROM precios_historial WHERE idhistorial = ? AND idcliente = ?",
        [idhistorial, idcliente],
      );

      await conn.commit();
      return res.status(200).json({ ok: true });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  res.status(405).end();
}
