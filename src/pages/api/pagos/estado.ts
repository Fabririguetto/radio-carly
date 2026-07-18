import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";
import { getMpConfig } from "@/lib/mp";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { orderId } = req.query;
  if (!orderId) return res.status(400).json({ error: "orderId requerido" });

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  const [rows] = await pool.query(
    "SELECT idpago, idcliente, monto, estado FROM pagos WHERE mp_order_id = ? LIMIT 1",
    [String(orderId)]
  );
  const pago = (rows as any[])[0];
  if (!pago) return res.status(404).json({ error: "Pago no encontrado" });

  if (pago.estado === "aprobado") return res.json({ estado: "aprobado" });

  // Consultar MP directamente
  try {
    const mp = await getMpConfig();
    const orderRes = await fetch(
      `https://api.mercadopago.com/v1/orders/${orderId}`,
      { headers: { Authorization: `Bearer ${mp.accessToken}` } }
    );
    if (!orderRes.ok) return res.json({ estado: pago.estado });

    const order = await orderRes.json();
    const payment = (order.transactions?.payments ?? []).find(
      (p: any) => p.status === "processed"
    );

    if (order.status === "processed" && payment) {
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
      return res.json({ estado: "aprobado" });
    }
  } catch (e) {
    console.error("estado MP check error:", e);
  }

  res.json({ estado: pago.estado });
}
