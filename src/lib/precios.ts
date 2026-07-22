import pool from "@/lib/db";

export async function getPrecioCliente(
  idcliente: number,
  fecha: string, // YYYY-MM-DD
): Promise<{ precio_hora: number; precio_reserva: number }> {
  const [rows] = await pool.query(
    `SELECT precio_hora, precio_reserva FROM precios_historial
     WHERE idcliente = ?
       AND fecha_desde <= ?
       AND (fecha_hasta IS NULL OR fecha_hasta >= ?)
     ORDER BY fecha_desde DESC
     LIMIT 1`,
    [idcliente, fecha, fecha],
  );

  if ((rows as any[]).length > 0) {
    const r = (rows as any[])[0];
    return { precio_hora: Number(r.precio_hora), precio_reserva: Number(r.precio_reserva) };
  }

  const [configRows] = await pool.query(
    "SELECT precio_hora, precio_reserva FROM config LIMIT 1",
  );
  const cfg = (configRows as any[])[0];
  return {
    precio_hora: Number(cfg?.precio_hora ?? 0),
    precio_reserva: Number(cfg?.precio_reserva ?? 0),
  };
}
