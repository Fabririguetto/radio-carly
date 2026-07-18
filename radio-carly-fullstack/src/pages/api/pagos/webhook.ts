import type { NextApiRequest, NextApiResponse } from "next";
import { MercadoPagoConfig, Payment } from "mercadopago";
import pool from "@/lib/db";

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

export const config = { api: { bodyParser: true } };

async function procesarPago(paymentId: string) {
  const payment = await new Payment(mp).get({ id: Number(paymentId) });
  if (payment.status !== "approved") return;

  // Checkout Pro → preference_id   |   QR POS → external_reference = preference_id
  const matchId =
    (payment as any).preference_id ??
    (payment as any).external_reference ??
    null;

  if (!matchId) return;

  const [pagoRows] = await pool.query(
    "SELECT idpago, idcliente, monto FROM pagos WHERE mp_preference_id = ? AND estado = 'pendiente'",
    [matchId]
  );
  const pago = (pagoRows as any[])[0];
  if (!pago) return;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "UPDATE pagos SET estado = 'aprobado', mp_payment_id = ? WHERE idpago = ?",
      [String(paymentId), pago.idpago]
    );
    await conn.query(
      `UPDATE ctacte SET ingreso = ingreso + ?, balance = balance - ? WHERE idcliente = ?`,
      [pago.monto, pago.monto, pago.idcliente]
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { type, action, data, topic, id } = req.body;

  try {
    if (type === "payment" && data?.id) {
      // Checkout Pro y QR POS (formato nuevo)
      await procesarPago(String(data.id));

    } else if (type === "topic" || topic === "merchant_order") {
      // Orden comercial de QR dinámico — buscamos los pagos dentro de la orden
      const orderId = data?.id ?? id;
      if (!orderId) return res.status(200).end();

      const orderRes = await fetch(
        `https://api.mercadopago.com/merchant_orders/${orderId}`,
        { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
      );
      const order = await orderRes.json();

      // Procesar cada pago aprobado de la orden
      for (const p of order.payments ?? []) {
        if (p.status === "approved") {
          await procesarPago(String(p.id));
        }
      }
    }
  } catch (e) {
    console.error("Webhook error:", e);
  }

  res.status(200).end();
}
