import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { id } = req.query;
  const idPago = parseInt(String(id), 10);
  if (!idPago || idPago <= 0) {
    return res.status(400).json({ error: "ID de pago inválido" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT idpago, idcliente, monto, estado FROM pagos WHERE idpago = ? FOR UPDATE",
      [idPago]
    );
    const pago = (rows as any[])[0];

    if (!pago) {
      await conn.rollback();
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    if (pago.estado !== "pendiente") {
      await conn.rollback();
      return res.status(400).json({ error: `El pago ya está en estado '${pago.estado}'` });
    }

    // Aprobar pago
    await conn.query(
      "UPDATE pagos SET estado = 'aprobado' WHERE idpago = ?",
      [idPago]
    );

    // Actualizar cuenta corriente del cliente
    await conn.query(
      "UPDATE ctacte SET ingreso = ingreso + ?, balance = balance - ? WHERE idcliente = ?",
      [Number(pago.monto), Number(pago.monto), pago.idcliente]
    );

    await conn.commit();
    return res.status(200).json({ ok: true, mensaje: "Pago aprobado y saldo actualizado" });
  } catch (err: any) {
    await conn.rollback();
    console.error("Error aprobando pago:", err);
    return res.status(500).json({ error: err.message || "Error al aprobar pago" });
  } finally {
    conn.release();
  }
}
