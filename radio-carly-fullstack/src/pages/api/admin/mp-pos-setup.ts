import type { NextApiRequest, NextApiResponse } from "next";

const BASE = "https://api.mercadopago.com";

function mpHeaders() {
  return {
    Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    // 1. Obtener el user_id del vendedor (collector_id)
    const userRes = await fetch(`${BASE}/v1/users/me`, { headers: mpHeaders() });
    const user = await userRes.json();
    if (!user.id) return res.status(500).json({ error: "No se pudo obtener user_id", detail: user });

    // 2. Crear sucursal (store)
    const storeRes = await fetch(`${BASE}/v1/stores`, {
      method: "POST",
      headers: mpHeaders(),
      body: JSON.stringify({ name: "WOX Rosario" }),
    });
    const store = await storeRes.json();
    if (!store.id) return res.status(500).json({ error: "No se pudo crear la sucursal", detail: store });

    // 3. Crear caja (POS)
    const posRes = await fetch(`${BASE}/v1/pos`, {
      method: "POST",
      headers: mpHeaders(),
      body: JSON.stringify({
        name: "Caja Principal",
        external_id: "wox-pos-001",
        store_id: store.id,
        fixed_amount: false,
      }),
    });
    const pos = await posRes.json();
    if (!pos.id) return res.status(500).json({ error: "No se pudo crear la caja", detail: pos });

    res.json({
      ok: true,
      collectorId: user.id,
      storeId: store.id,
      posId: pos.id,
      posExternalId: pos.external_id,
      // Copiá estos valores en las variables de entorno de Railway:
      envVars: {
        MP_COLLECTOR_ID: String(user.id),
        MP_POS_EXTERNAL_ID: pos.external_id,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
