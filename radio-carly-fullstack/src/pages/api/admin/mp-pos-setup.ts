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

  const { collector_id } = req.body as { collector_id?: string };
  if (!collector_id) {
    return res.status(400).json({
      error: "Enviá collector_id en el body (es el User ID de tus credenciales de MP)",
    });
  }

  try {
    // 1. Crear sucursal — endpoint correcto: /users/{user_id}/stores
    const storeRes = await fetch(`${BASE}/users/${collector_id}/stores`, {
      method: "POST",
      headers: mpHeaders(),
      body: JSON.stringify({
        name: "WOX Rosario",
        business_hours: {
          monday:    [{ open: "00:00", close: "23:59" }],
          tuesday:   [{ open: "00:00", close: "23:59" }],
          wednesday: [{ open: "00:00", close: "23:59" }],
          thursday:  [{ open: "00:00", close: "23:59" }],
          friday:    [{ open: "00:00", close: "23:59" }],
          saturday:  [{ open: "00:00", close: "23:59" }],
          sunday:    [{ open: "00:00", close: "23:59" }],
        },
        location: {
          street_name: "Rosario",
          street_number: "1",
          city_name: "Rosario",
          state_name: "Santa Fe",
          latitude: -32.9442,
          longitude: -60.6505,
          reference: "WOX Rosario",
        },
      }),
    });
    const store = await storeRes.json();
    if (!store.id) return res.status(500).json({ error: "No se pudo crear la sucursal", detail: store });

    // 2. Crear caja — endpoint: /pos
    const posRes = await fetch(`${BASE}/pos`, {
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
      storeId: store.id,
      posId: pos.id,
      posExternalId: pos.external_id,
      envVars: {
        MP_COLLECTOR_ID: collector_id,
        MP_POS_EXTERNAL_ID: pos.external_id,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
