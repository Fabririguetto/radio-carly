import type { NextApiRequest, NextApiResponse } from "next";
import { createHmac } from "crypto";
import pool from "@/lib/db";
import { getMpConfig, invalidateMpConfig } from "@/lib/mp";

export const config = { api: { bodyParser: true } };

async function firmaValida(req: NextApiRequest): Promise<boolean> {
  const mp = await getMpConfig();
  const secret = mp.webhookSecret;
  if (!secret) return true;

  const xSignature = req.headers["x-signature"] as string;
  const xRequestId = req.headers["x-request-id"] as string;
  if (!xSignature || !xRequestId) return false;

  const parts = Object.fromEntries(xSignature.split(",").map((p) => p.split("=")));
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const dataId = req.body?.data?.id ?? "";
  const message = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hash = createHmac("sha256", secret).update(message).digest("hex");

  return hash === v1;
}

async function procesarPayment(paymentId: string) {
  const mp = await getMpConfig();
  const payRes = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    { headers: { Authorization: `Bearer ${mp.accessToken}` } }
  );
  if (!payRes.ok) return;

  const payment = await payRes.json();
  if (payment.status !== "approved") return;

  const externalRef = payment.external_reference;
  if (!externalRef) return;

  const [pagoRows] = await pool.query(
    "SELECT idpago, idcliente, monto FROM pagos WHERE mp_order_id = ? AND estado = 'pendiente'",
    [externalRef]
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

async function procesarOrder(orderId: string) {
  const mp = await getMpConfig();
  const orderRes = await fetch(
    `https://api.mercadopago.com/v1/orders/${orderId}`,
    { headers: { Authorization: `Bearer ${mp.accessToken}` } }
  );
  if (!orderRes.ok) return;

  const order = await orderRes.json();
  if (order.status !== "processed") return;

  const payment = (order.transactions?.payments ?? []).find(
    (p: any) => p.status === "processed"
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

  if (!await firmaValida(req)) {
    console.warn("Webhook: firma inválida");
    return res.status(200).end();
  }

  const { type, data } = req.body;

  try {
    if (type === "order" && data?.id) {
      await procesarOrder(String(data.id));
    } else if (type === "payment" && data?.id) {
      await procesarPayment(String(data.id));
    } else if (type === "mp-connect") {
      if (req.body.action === "application.deauthorized") {
        await pool.query(
          "UPDATE config SET mp_access_token = NULL, mp_refresh_token = NULL WHERE id = 1"
        );
        invalidateMpConfig();
        console.log("mp-connect: aplicación desautorizada, token removido");
      }
    }
  } catch (e) {
    console.error("Webhook error:", e);
  }

  res.status(200).end();
}
