import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import pool from "@/lib/db";
import { getMpConfig } from "@/lib/mp";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { idcliente, monto } = req.body;
  if (!idcliente || !monto || Number(monto) <= 0) {
    return res.status(400).json({ error: "idcliente y monto válido son requeridos" });
  }
  if (Number(monto) < 15) {
    return res.status(400).json({ error: "El monto mínimo para pagar con Mercado Pago es $15." });
  }

  const [rows] = await pool.query("SELECT nombre FROM clientes WHERE idcliente = ?", [idcliente]);
  const cliente = (rows as any[])[0];
  if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

  const mp = await getMpConfig();
  if (!mp.accessToken) {
    return res.status(503).json({ error: "Mercado Pago no está configurado." });
  }

  const externalRef = `wox-link-${idcliente}-${Date.now()}`;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

  const prefRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${mp.accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify({
      items: [{
        title: `${mp.nombreNegocio} — ${cliente.nombre}`,
        unit_price: Number(Number(monto).toFixed(2)),
        quantity: 1,
        currency_id: "ARS",
      }],
      external_reference: externalRef,
      back_urls: {
        success:  `${appUrl}/?pago=ok`,
        failure:  `${appUrl}/?pago=error`,
        pending:  `${appUrl}/?pago=pendiente`,
      },
      auto_return: "approved",
      notification_url: `${appUrl}/api/pagos/webhook`,
    }),
  });

  if (!prefRes.ok) {
    const err = await prefRes.json().catch(() => ({}));
    console.error("MP preference error:", JSON.stringify(err));
    return res.status(502).json({ error: "Error al crear el link de pago en Mercado Pago." });
  }

  const pref = await prefRes.json();

  await pool.query(
    `INSERT INTO pagos (idcliente, monto, mp_order_id, estado, tipo) VALUES (?, ?, ?, 'pendiente', 'qr')`,
    [idcliente, Number(monto), externalRef],
  );

  return res.status(200).json({ url: pref.init_point });
}
