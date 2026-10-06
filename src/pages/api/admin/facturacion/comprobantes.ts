import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const [rows] = await pool.query(
      `SELECT comp.id_comprobante, comp.idpago, comp.tipo_comprobante, comp.punto_venta,
              comp.nro_comprobante, comp.cae, comp.cae_vencimiento, comp.estado, comp.total,
              comp.error_msg, comp.fecha_emision,
              c.nombre AS cliente_nombre, c.dni AS cliente_dni,
              p.tipo AS pago_tipo, p.motivo AS pago_motivo
       FROM comprobantes comp
       JOIN clientes c ON c.idcliente = comp.idcliente
       LEFT JOIN pagos p ON p.idpago = comp.idpago
       ORDER BY comp.fecha_emision DESC
       LIMIT 300`
    );

    return res.status(200).json(rows);
  } catch (err: any) {
    console.error("Error al obtener comprobantes:", err);
    return res.status(500).json({ error: err.message });
  }
}
