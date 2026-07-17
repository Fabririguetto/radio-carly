import type { NextApiRequest, NextApiResponse } from "next";
import { MercadoPagoConfig, Payment } from "mercadopago";
import pool from "@/lib/db";

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

export const config = { api: { bodyParser: true } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { type, data } = req.body;

  // Solo procesamos notificaciones de pagos aprobados
  if (type !== "payment" || !data?.id) return res.status(200).end();

  const payment = await new Payment(mp).get({ id: data.id });
  if (payment.status !== "approved") return res.status(200).end();

  const preferenceId = (payment as any).preference_id;

  const [pagoRows] = await pool.query(
    "SELECT idpago, idcliente, monto FROM pagos WHERE mp_preference_id = ? AND estado = 'pendiente'",
    [preferenceId]
  );
  const pago = (pagoRows as any[])[0];
  if (!pago) return res.status(200).end();

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      "UPDATE pagos SET estado = 'aprobado', mp_payment_id = ? WHERE idpago = ?",
      [String(data.id), pago.idpago]
    );

    await conn.query(
      `UPDATE ctacte
       SET ingreso = ingreso + ?,
           balance = balance - ?
       WHERE idcliente = ?`,
      [pago.monto, pago.monto, pago.idcliente]
    );

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  res.status(200).end();
}
