import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";
import { invalidateMpConfig } from "@/lib/mp";

const MP_BASE = "https://api.mercadopago.com";

function mpHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const [rows] = await pool.query(
        "SELECT nombre_negocio, mp_collector_id, mp_pos_external_id, mp_access_token, direccion, ciudad, provincia FROM config LIMIT 1"
      );
      const row = (rows as any[])[0] ?? {};
      return res.json({
        configurado: !!row.mp_access_token,
        nombre_negocio: row.nombre_negocio ?? "",
        mp_collector_id: row.mp_collector_id ?? "",
        mp_pos_external_id: row.mp_pos_external_id ?? "",
        mp_token_hint: row.mp_access_token
          ? `...${String(row.mp_access_token).slice(-6)}`
          : null,
        direccion: row.direccion ?? "",
        ciudad: row.ciudad ?? "",
        provincia: row.provincia ?? "",
      });
    } catch (e: any) {
      console.error("mp-config GET error:", e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === "POST") {
    const { access_token, nombre_negocio, direccion, ciudad, provincia } = req.body as {
      access_token?: string;
      nombre_negocio?: string;
      direccion?: string;
      ciudad?: string;
      provincia?: string;
    };

    if (!access_token?.trim() || !nombre_negocio?.trim() || !direccion?.trim() || !ciudad?.trim() || !provincia?.trim()) {
      return res.status(400).json({ error: "Completá todos los campos: nombre, dirección, ciudad, provincia y Access Token." });
    }

    // 1. Geocodificar dirección con Nominatim (OpenStreetMap)
    let lat = -34.6037;
    let lng = -58.3816;
    try {
      const geoUrl = "https://nominatim.openstreetmap.org/search?" + new URLSearchParams({
        q: `${direccion.trim()}, ${ciudad.trim()}, ${provincia.trim()}, Argentina`,
        format: "json",
        limit: "1",
      });
      const geoRes = await fetch(geoUrl, { headers: { "User-Agent": "RadioCarlyApp/1.0" } });
      const geoData = await geoRes.json();
      if (geoData[0]) {
        lat = parseFloat(geoData[0].lat);
        lng = parseFloat(geoData[0].lon);
      }
    } catch {
      // fallback a Buenos Aires
    }

    // 2. Validar token y obtener collector_id
    const meRes = await fetch(`${MP_BASE}/users/me`, {
      headers: mpHeaders(access_token),
    });
    if (!meRes.ok) {
      return res.status(400).json({ error: "Token inválido o sin permisos en Mercado Pago" });
    }
    const me = await meRes.json();
    const collectorId = String(me.id);

    if (me.tags?.includes("test_user")) {
      return res.status(400).json({
        error: "El token pertenece a una cuenta de prueba. Usá el token de producción.",
      });
    }

    // 3. Crear sucursal
    const storeRes = await fetch(`${MP_BASE}/users/${collectorId}/stores`, {
      method: "POST",
      headers: mpHeaders(access_token),
      body: JSON.stringify({
        name: nombre_negocio.trim(),
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
          street_name: direccion.trim(),
          street_number: "0",
          city_name: ciudad.trim(),
          state_name: provincia.trim(),
          latitude: lat,
          longitude: lng,
          reference: nombre_negocio.trim(),
        },
      }),
    });
    const store = await storeRes.json();
    if (!store.id) {
      return res.status(502).json({ error: "No se pudo crear la sucursal en MP", detail: store });
    }

    // 4. Crear caja POS
    const posExternalId = `CAJA${collectorId}`;
    const posRes = await fetch(`${MP_BASE}/pos`, {
      method: "POST",
      headers: mpHeaders(access_token),
      body: JSON.stringify({
        name: "Caja Principal",
        external_id: posExternalId,
        store_id: store.id,
        fixed_amount: false,
      }),
    });
    const pos = await posRes.json();
    if (!pos.id) {
      return res.status(502).json({ error: "No se pudo crear la caja en MP", detail: pos });
    }

    // 5. Guardar en DB
    await pool.query(
      `UPDATE config SET
        nombre_negocio     = ?,
        mp_access_token    = ?,
        mp_collector_id    = ?,
        mp_pos_external_id = ?,
        direccion          = ?,
        ciudad             = ?,
        provincia          = ?
      WHERE id = 1`,
      [nombre_negocio.trim(), access_token.trim(), collectorId, pos.external_id, direccion.trim(), ciudad.trim(), provincia.trim()]
    );

    invalidateMpConfig();

    return res.json({
      ok: true,
      nombre_negocio: nombre_negocio.trim(),
      mp_collector_id: collectorId,
      mp_pos_external_id: pos.external_id,
      mp_token_hint: `...${access_token.trim().slice(-6)}`,
    });
  }

  res.status(405).end();
}
