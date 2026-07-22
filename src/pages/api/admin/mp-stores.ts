import type { NextApiRequest, NextApiResponse } from "next";
import { getMpConfig } from "@/lib/mp";

const BASE = "https://api.mercadopago.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const mp = await getMpConfig();
  if (!mp.accessToken || !mp.collectorId) {
    return res.status(400).json({ error: "MP no configurado" });
  }

  const headers = { Authorization: `Bearer ${mp.accessToken}`, "Content-Type": "application/json" };
  const storeExternalId = `STORE${mp.collectorId}`;

  if (req.method === "GET") {
    const searchRes = await fetch(
      `${BASE}/users/${mp.collectorId}/stores/search?external_id=${storeExternalId}`,
      { headers }
    );
    if (!searchRes.ok) {
      const err = await searchRes.json().catch(() => ({}));
      return res.status(502).json({ error: "Error al buscar sucursal", detail: err });
    }
    const data = await searchRes.json();
    const results: any[] = Array.isArray(data) ? (data[0]?.results ?? []) : (data?.results ?? []);
    const store = results.find((s) => s.external_id === storeExternalId) ?? results[0] ?? null;
    return res.status(200).json({ store });
  }

  if (req.method === "DELETE") {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "id requerido" });

    const deleteRes = await fetch(`${BASE}/users/${mp.collectorId}/stores/${id}`, {
      method: "DELETE",
      headers,
    });
    if (!deleteRes.ok) {
      const err = await deleteRes.json().catch(() => ({}));
      return res.status(502).json({ error: "Error al eliminar sucursal", detail: err });
    }
    const result = await deleteRes.json();
    return res.status(200).json({ ok: true, ...result });
  }

  return res.status(405).end();
}
