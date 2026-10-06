import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { id } = req.query;
  const idPago = parseInt(String(id), 10);
  if (!idPago || idPago <= 0) {
    return res.status(400).json({ error: "ID de pago inválido" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT idpago, estado FROM pagos WHERE idpago = ?",
      [idPago]
    );
    const pago = (rows as any[])[0];

    if (!pago) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    if (pago.estado !== "pendiente") {
      return res.status(400).json({ error: `El pago ya está en estado '${pago.estado}'` });
    }

    await pool.query(
      "UPDATE pagos SET estado = 'rechazado' WHERE idpago = ?",
      [idPago]
    );

    return res.status(200).json({ ok: true, mensaje: "Pago rechazado" });
  } catch (err: any) {
    console.error("Error rechazando pago:", err);
    return res.status(500).json({ error: err.message || "Error al rechazar pago" });
  }
}
