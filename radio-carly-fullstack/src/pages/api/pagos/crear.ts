import type { NextApiRequest, NextApiResponse } from "next";
import { MercadoPagoConfig, Preference } from "mercadopago";
import QRCode from "qrcode";
import pool from "@/lib/db";

const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { idcliente, monto } = req.body;
  if (!idcliente || !monto || monto <= 0) {
    return res.status(400).json({ error: "idcliente y monto válido son requeridos" });
  }

  const [rows] = await pool.query(
    "SELECT nombre, dni FROM clientes WHERE idcliente = ?",
    [idcliente]
  );
  const cliente = (rows as any[])[0];
  if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

  // ── Checkout Pro ─────────────────────────────────────────────────────────────
  const preference = await new Preference(mp).create({
    body: {
      items: [
        {
          id: `sesion-${idcliente}`,
          title: `WOX Rosario — ${cliente.nombre}`,
          quantity: 1,
          unit_price: Number(monto),
          currency_id: "ARS",
        },
      ],
      payer: { name: cliente.nombre },
      external_reference: `pref-${idcliente}-${Date.now()}`,
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/pago-exitoso`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/pago-fallido`,
      },
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/pagos/webhook`,
      auto_return: "approved",
    },
  });

  // QR de cámara (Checkout Pro init_point codificado como imagen)
  const qrCamara = await QRCode.toDataURL(preference.init_point!, { width: 300, margin: 2 });

  // Guardar pago pendiente (preference.id actúa como referencia compartida con el QR POS)
  await pool.query(
    `INSERT INTO pagos (idcliente, monto, mp_preference_id, estado)
     VALUES (?, ?, ?, 'pendiente')`,
    [idcliente, monto, preference.id]
  );

  // ── QR POS dinámico (app de Mercado Pago) ────────────────────────────────────
  let qrPos: string | null = null;
  let posDebug: unknown = null;

  const collectorId   = process.env.MP_COLLECTOR_ID;
  const posExternalId = process.env.MP_POS_EXTERNAL_ID;

  if (collectorId && posExternalId) {
    try {
      const posRes = await fetch(
        `https://api.mercadopago.com/instore/orders/qr/seller/collectors/${collectorId}/pos/${posExternalId}/qrs`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            external_reference: preference.id,
            title: `WOX Rosario — ${cliente.nombre}`,
            description: "Sesión de radio",
            notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/pagos/webhook`,
            total_amount: Number(monto),
            items: [
              {
                sku_number: `sesion-${idcliente}`,
                category: "services",
                title: `Sesión — ${cliente.nombre}`,
                description: "Sesión de radio WOX Rosario",
                unit_price: Number(monto),
                quantity: 1,
                unit_measure: "unit",
                total_amount: Number(monto),
              },
            ],
          }),
        }
      );
      const posData = await posRes.json();
      if (posData.qr_data) {
        qrPos = await QRCode.toDataURL(posData.qr_data, { width: 300, margin: 2 });
      } else {
        posDebug = { status: posRes.status, body: posData };
        console.error("POS QR sin qr_data:", JSON.stringify(posData));
      }
    } catch (e: any) {
      posDebug = { error: e.message };
      console.error("POS QR error:", e);
    }
  } else {
    posDebug = { missing: { collectorId: !collectorId, posExternalId: !posExternalId } };
  }

  res.status(200).json({
    preferenceId: preference.id,
    initPoint: preference.init_point,
    qr: qrCamara,
    qrPos,
    posDebug,   // remover una vez resuelto el QR
  });
}
