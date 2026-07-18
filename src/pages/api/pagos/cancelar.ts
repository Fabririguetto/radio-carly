import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: "orderId requerido" });

  try {
    const cancelRes = await fetch(
      `https://api.mercadopago.com/v1/orders/${orderId}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": randomUUID(),
        },
      }
    );

    // 409 = orden ya procesada o cancelada, es OK
    if (cancelRes.ok || cancelRes.status === 409) {
      return res.status(200).json({ ok: true });
    }

    const err = await cancelRes.json();
    console.error("Cancel order error:", JSON.stringify(err));
    return res.status(200).json({ ok: false });
  } catch (e: any) {
    console.error("Cancel order exception:", e.message);
    return res.status(200).json({ ok: false });
  }
}
