import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export const config = { api: { bodyParser: true } };

async function procesarOrder(orderId: string) {
  const orderRes = await fetch(
    `https://api.mercadopago.com/v1/orders/${orderId}`,
    { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } }
  );
  if (!orderRes.ok) return;

  const order = await orderRes.json();
  if (order.status !== "processed") return;

  const payment = (order.transactions?.payments ?? []).find(
    (p: any) => p.status === "approved"
  );
  if (!payment) return;

  const [pagoRows] = await pool.query(
    "SELECT idpago, idcliente, monto FROM pagos WHERE mp_order_id = ? AND estado = 'pendiente'",
    [orderId]
  );
  const pago = (pagoRows as any[])[0];
  if (!pago) return;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "UPDATE pagos SET estado = 'aprobado', mp_payment_id = ? WHERE idpago = ?",
      [payment.id, pago.idpago]
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
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { type, data } = req.body;

  try {
    if (type === "order" && data?.id) {
      await procesarOrder(String(data.id));
    }
  } catch (e) {
    console.error("Webhook error:", e);
  }

  res.status(200).end();
}
