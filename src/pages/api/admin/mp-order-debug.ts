import type { NextApiRequest, NextApiResponse } from "next";
import { getMpConfig } from "@/lib/mp";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const { order_id } = req.query;
  if (!order_id) return res.status(400).json({ error: "order_id requerido" });

  const mp = await getMpConfig();
  const r = await fetch(`https://api.mercadopago.com/v1/orders/${order_id}`, {
    headers: { Authorization: `Bearer ${mp.accessToken}` },
  });
  const data = await r.json();
  res.status(200).json(data);
}
