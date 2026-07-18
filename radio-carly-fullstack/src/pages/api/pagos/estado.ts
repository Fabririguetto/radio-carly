import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

const MP_BASE = "https://api.mercadopago.com";

function mpHeaders() {
  return { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` };
}

async function procesarPagoEnDB(paymentId: string, matchId: string): Promise<boolean> {
  const [pagoRows] = await pool.query(
    "SELECT idpago, idcliente, monto FROM pagos WHERE mp_preference_id = ? AND estado = 'pendiente'",
    [matchId]
  );
  const pago = (pagoRows as any[])[0];
  if (!pago) return false;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "UPDATE pagos SET estado = 'aprobado', mp_payment_id = ? WHERE idpago = ?",
      [paymentId, pago.idpago]
    );
    await conn.query(
      "UPDATE ctacte SET ingreso = ingreso + ?, balance = balance - ? WHERE idcliente = ?",
      [pago.monto, pago.monto, pago.idcliente]
    );
    await conn.commit();
    return true;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function checkMPPorPagoEnTienda(prefId: string): Promise<boolean> {
  // 1. Buscar merchant orders por external_reference (QR POS)
  try {
    const ordersRes = await fetch(
      `${MP_BASE}/merchant_orders?external_reference=${prefId}`,
      { headers: mpHeaders() }
    );
    const ordersData = await ordersRes.json();
    for (const order of ordersData.elements ?? []) {
      if (order.order_status === "paid") {
        const payment = (order.payments ?? []).find((p: any) => p.status === "approved");
        if (payment) {
          await procesarPagoEnDB(String(payment.id), prefId);
          return true;
        }
      }
    }
  } catch { /* continuar */ }

  // 2. Buscar payments por preference_id (Checkout Pro fallback)
  try {
    const paymentsRes = await fetch(
      `${MP_BASE}/v1/payments/search?preference_id=${prefId}&status=approved`,
      { headers: mpHeaders() }
    );
    const paymentsData = await paymentsRes.json();
    const payment = paymentsData.results?.[0];
    if (payment) {
      await procesarPagoEnDB(String(payment.id), prefId);
      return true;
    }
  } catch { /* continuar */ }

  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { preferenceId } = req.query;
  if (!preferenceId) return res.status(400).json({ error: "preferenceId requerido" });

  const prefId = String(preferenceId);

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  const [rows] = await pool.query(
    "SELECT estado FROM pagos WHERE mp_preference_id = ? LIMIT 1",
    [prefId]
  );
  const pago = (rows as any[])[0];
  if (!pago) return res.status(404).json({ error: "Pago no encontrado" });

  if (pago.estado === "aprobado") return res.json({ estado: "aprobado" });

  // Si sigue pendiente, consultar la API de MP directamente
  const encontrado = await checkMPPorPagoEnTienda(prefId);
  res.json({ estado: encontrado ? "aprobado" : pago.estado });
}
