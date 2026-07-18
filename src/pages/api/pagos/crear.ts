import type { NextApiRequest, NextApiResponse } from "next";
import QRCode from "qrcode";
import { randomUUID } from "crypto";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { idcliente, monto } = req.body;
  if (!idcliente || !monto || monto <= 0) {
    return res.status(400).json({ error: "idcliente y monto válido son requeridos" });
  }
  if (Number(monto) < 15) {
    return res.status(400).json({ error: "El monto mínimo para pagar con QR es $15." });
  }

  const [rows] = await pool.query(
    "SELECT nombre FROM clientes WHERE idcliente = ?",
    [idcliente]
  );
  const cliente = (rows as any[])[0];
  if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

  const montoStr = Number(monto).toFixed(2);
  const externalRef = `wox-${idcliente}-${Date.now()}`;

  console.log("MP_WEBHOOK_URL:", process.env.MP_WEBHOOK_URL);
  const orderRes = await fetch("https://api.mercadopago.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify({
      type: "qr",
      total_amount: montoStr,
      description: `WOX Rosario — ${cliente.nombre}`,
      external_reference: externalRef,
      expiration_time: "PT2M",
      notification_url: process.env.MP_WEBHOOK_URL,
      config: {
        qr: {
          external_pos_id: process.env.MP_POS_EXTERNAL_ID,
          mode: "dynamic",
        },
      },
      transactions: {
        payments: [{ amount: montoStr }],
      },
      items: [
        {
          title: `Sesión — ${cliente.nombre}`,
          unit_price: montoStr,
          quantity: 1,
          unit_measure: "unit",
        },
      ],
    }),
  });

  if (!orderRes.ok) {
    const err = await orderRes.json();
    console.error("MP /v1/orders error:", JSON.stringify(err));
    return res.status(502).json({ error: "Error al crear la orden en Mercado Pago", detail: err });
  }

  const order = await orderRes.json();
  console.log("MP order response:", JSON.stringify(order).slice(0, 500));
  const qrData = order.type_response?.qr_data;

  if (!qrData) {
    console.error("MP order sin qr_data:", JSON.stringify(order));
    return res.status(502).json({ error: "Respuesta de MP sin qr_data", detail: order });
  }

  const qrPos = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });

  await pool.query(
    `INSERT INTO pagos (idcliente, monto, mp_order_id, estado) VALUES (?, ?, ?, 'pendiente')`,
    [idcliente, monto, order.id]
  );

  res.status(200).json({ orderId: order.id, qrPos });
}
