import type { NextApiRequest, NextApiResponse } from "next";
import QRCode from "qrcode";
import { randomUUID } from "crypto";
import pool from "@/lib/db";
import { getMpConfig } from "@/lib/mp";

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
  const mp = await getMpConfig();

  // integration_data solo se envía si MP asignó un platform_id real
  const integrationData = process.env.MP_PLATFORM_ID
    ? {
        platform_id: process.env.MP_PLATFORM_ID,
        ...(process.env.MP_INTEGRATOR_ID ? { integrator_id: process.env.MP_INTEGRATOR_ID } : {}),
      }
    : null;

  const orderRes = await fetch("https://api.mercadopago.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${mp.accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify({
      type: "qr",
      total_amount: montoStr,
      description: `${mp.nombreNegocio} — ${cliente.nombre}`,
      external_reference: externalRef,
      expiration_time: "PT2M",
      ...(integrationData ? { integration_data: integrationData } : {}),
      config: {
        qr: {
          external_pos_id: mp.posExternalId,
          mode: "dynamic",
        },
      },
      transactions: {
        payments: [{ amount: montoStr }],
      },
      items: [
        {
          title: `Sesión — ${cliente.nombre} (${mp.nombreNegocio})`,
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
