import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { porcentaje, fecha_desde } = req.body;
  if (!porcentaje || !fecha_desde) {
    return res.status(400).json({ error: "porcentaje y fecha_desde son requeridos" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_desde)) {
    return res.status(400).json({ error: "Formato de fecha inválido (YYYY-MM-DD)" });
  }
  const pct = Number(porcentaje);
  if (isNaN(pct) || pct <= 0 || pct > 1000) {
    return res.status(400).json({ error: "Porcentaje inválido (1–1000)" });
  }

  // Obtener todos los clientes activos con sus precios actuales (desde historial o config)
  const hoy = new Date().toISOString().slice(0, 10);

  const [configRows] = await pool.query("SELECT precio_hora, precio_reserva FROM config LIMIT 1");
  const configGlobal = (configRows as any[])[0];

  const [clientes] = await pool.query(
    "SELECT idcliente FROM clientes WHERE activo = 1",
  );

  const conn = await pool.getConnection();
  let actualizados = 0;

  try {
    await conn.beginTransaction();

    for (const c of clientes as any[]) {
      const { idcliente } = c;

      // Precio vigente para este cliente
      const [precioRows] = await conn.query(
        `SELECT precio_hora, precio_reserva FROM precios_historial
         WHERE idcliente = ?
           AND fecha_desde <= ?
           AND (fecha_hasta IS NULL OR fecha_hasta >= ?)
         ORDER BY fecha_desde DESC LIMIT 1`,
        [idcliente, hoy, hoy],
      );

      let precioBase: { precio_hora: number; precio_reserva: number };
      if ((precioRows as any[]).length > 0) {
        const r = (precioRows as any[])[0];
        precioBase = { precio_hora: Number(r.precio_hora), precio_reserva: Number(r.precio_reserva) };
      } else {
        precioBase = {
          precio_hora: Number(configGlobal.precio_hora),
          precio_reserva: Number(configGlobal.precio_reserva),
        };
      }

      const nuevoPrecioHora = Math.round(precioBase.precio_hora * (1 + pct / 100));
      const nuevoPrecioReserva = Math.round(precioBase.precio_reserva * (1 + pct / 100));

      // Cerrar el registro anterior
      const [anteriorRows] = await conn.query(
        `SELECT idhistorial FROM precios_historial
         WHERE idcliente = ? AND fecha_desde < ?
         ORDER BY fecha_desde DESC LIMIT 1`,
        [idcliente, fecha_desde],
      );
      const anterior = (anteriorRows as any[])[0];

      if (anterior) {
        await conn.query(
          `UPDATE precios_historial SET fecha_hasta = DATE_SUB(?, INTERVAL 1 DAY) WHERE idhistorial = ?`,
          [fecha_desde, anterior.idhistorial],
        );
      }

      // Buscar si ya existe un registro para esta fecha_desde
      const [existeRows] = await conn.query(
        "SELECT idhistorial FROM precios_historial WHERE idcliente = ? AND fecha_desde = ?",
        [idcliente, fecha_desde],
      );

      if ((existeRows as any[]).length > 0) {
        await conn.query(
          `UPDATE precios_historial SET precio_hora = ?, precio_reserva = ? WHERE idhistorial = ?`,
          [nuevoPrecioHora, nuevoPrecioReserva, (existeRows as any[])[0].idhistorial],
        );
      } else {
        const [siguienteRows] = await conn.query(
          `SELECT fecha_desde FROM precios_historial
           WHERE idcliente = ? AND fecha_desde > ?
           ORDER BY fecha_desde ASC LIMIT 1`,
          [idcliente, fecha_desde],
        );
        const siguiente = (siguienteRows as any[])[0];
        const fechaHasta = siguiente
          ? new Date(new Date(siguiente.fecha_desde).getTime() - 86400000).toISOString().slice(0, 10)
          : null;

        await conn.query(
          `INSERT INTO precios_historial (idcliente, precio_hora, precio_reserva, fecha_desde, fecha_hasta)
           VALUES (?, ?, ?, ?, ?)`,
          [idcliente, nuevoPrecioHora, nuevoPrecioReserva, fecha_desde, fechaHasta],
        );
      }

      actualizados++;
    }

    await conn.commit();
    return res.status(200).json({ ok: true, actualizados });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
