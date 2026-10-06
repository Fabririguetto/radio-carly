import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const [rows] = await pool.query(
      `SELECT p.idpago, p.monto, p.fecha, p.tipo, p.motivo, p.comprobante_transferencia,
              c.idcliente, c.nombre AS cliente_nombre, c.dni AS cliente_dni,
              comp.id_comprobante, comp.estado AS estado_comprobante, comp.error_msg
       FROM pagos p
       JOIN clientes c ON c.idcliente = p.idcliente
       LEFT JOIN (
         SELECT c1.*
         FROM comprobantes c1
         INNER JOIN (
           SELECT idpago, MAX(id_comprobante) as max_id
           FROM comprobantes
           GROUP BY idpago
         ) c2 ON c1.id_comprobante = c2.max_id
       ) comp ON comp.idpago = p.idpago
       WHERE p.estado = 'aprobado'
         AND p.tipo != 'bonificacion'
         AND (comp.id_comprobante IS NULL OR comp.estado = 'error')
       ORDER BY p.fecha DESC
       LIMIT 200`
    );

    return res.status(200).json(rows);
  } catch (err: any) {
    console.error("Error al obtener pagos pendientes de facturar:", err);
    return res.status(500).json({ error: err.message });
  }
}
