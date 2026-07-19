import type { NextApiRequest, NextApiResponse } from "next";
import { getMpConfig } from "@/lib/mp";

const BASE = "https://api.mercadopago.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const mp = await getMpConfig();
  if (!mp.accessToken || !mp.posExternalId) {
    return res.status(400).json({ error: "MP no está configurado" });
  }

  const headers = { Authorization: `Bearer ${mp.accessToken}`, "Content-Type": "application/json" };

  const listRes = await fetch(`${BASE}/pos`, { headers });
  if (!listRes.ok) {
    const err = await listRes.json().catch(() => ({}));
    return res.status(502).json({ error: "Error al listar POS en MP", detail: err });
  }
  const listData = await listRes.json();
  const pos = (listData.results ?? []).find((p: any) => p.external_id === mp.posExternalId);

  if (!pos) {
    return res.status(404).json({
      error: `POS "${mp.posExternalId}" no encontrado en MP`,
      pos_disponibles: (listData.results ?? []).map((p: any) => ({
        id: p.id,
        external_id: p.external_id,
        fixed_amount: p.fixed_amount,
      })),
    });
  }

  if (pos.fixed_amount === true) {
    return res.status(200).json({ ok: true, ya_configurado: true, pos_id: pos.id });
  }

  const updateRes = await fetch(`${BASE}/pos/${pos.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      name: pos.name,
      fixed_amount: true,
      store_id: String(pos.store_id),
      external_id: pos.external_id,
    }),
  });
  const updated = await updateRes.json();

  if (!updateRes.ok) {
    return res.status(502).json({ error: "Error al actualizar el POS", detail: updated });
  }

  return res.status(200).json({ ok: true, pos_id: updated.id, fixed_amount: updated.fixed_amount });
}
