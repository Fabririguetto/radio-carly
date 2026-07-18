import type { NextApiRequest, NextApiResponse } from "next";
import { MercadoPagoConfig, Payment } from "mercadopago";
import pool from "@/lib/db";

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { payment_id } = req.query;
  if (!payment_id) return res.status(400).json({ error: "payment_id requerido" });

  try {
    const payment = await new Payment(mp).get({ id: Number(payment_id) });
    if (payment.status !== "approved") return res.json({ ok: false, status: payment.status });

    const matchId =
      (payment as any).preference_id ??
      (payment as any).external_reference ??
      null;

    if (!matchId) return res.json({ ok: false, reason: "sin matchId" });

    const [pagoRows] = await pool.query(
      "SELECT idpago, idcliente, monto FROM pagos WHERE mp_preference_id = ? AND estado = 'pendiente'",
      [matchId]
    );
    const pago = (pagoRows as any[])[0];
    if (!pago) return res.json({ ok: false, reason: "ya procesado o no encontrado" });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        "UPDATE pagos SET estado = 'aprobado', mp_payment_id = ? WHERE idpago = ?",
        [String(payment_id), pago.idpago]
      );
      await conn.query(
        "UPDATE ctacte SET ingreso = ingreso + ?, balance = balance - ? WHERE idcliente = ?",
        [pago.monto, pago.monto, pago.idcliente]
      );
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
