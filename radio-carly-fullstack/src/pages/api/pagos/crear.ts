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

  const preference = await new Preference(mp).create({
    body: {
      items: [
        {
          id: `radio-sesion-${idcliente}`,
          title: `Radio Carly — ${cliente.nombre}`,
          quantity: 1,
          unit_price: Number(monto),
          currency_id: "ARS",
        },
      ],
      payer: { name: cliente.nombre },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/pago-exitoso`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/pago-fallido`,
      },
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/pagos/webhook`,
      auto_return: "approved",
    },
  });

  // Guardar el pago en estado pendiente
  await pool.query(
    `INSERT INTO pagos (idcliente, monto, mp_preference_id, estado)
     VALUES (?, ?, ?, 'pendiente')`,
    [idcliente, monto, preference.id]
  );

  // Generar QR como imagen base64
  const qrDataUrl = await QRCode.toDataURL(preference.init_point!, {
    width: 300,
    margin: 2,
  });

  res.status(200).json({
    preferenceId: preference.id,
    initPoint: preference.init_point,
    qr: qrDataUrl,
  });
}
