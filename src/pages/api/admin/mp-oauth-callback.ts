import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";
import { invalidateMpConfig } from "@/lib/mp";

const MP_BASE = "https://api.mercadopago.com";

function mpHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function safeJson(res: Response, label: string): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} devolvió no-JSON (${res.status}): ${text.slice(0, 300)}`);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect("/admin/config?mp=error&reason=denied");
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/mp-oauth-callback`;

    // 1. Intercambiar código por tokens
    const tokenRes = await fetch(`${MP_BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.MP_CLIENT_ID,
        client_secret: process.env.MP_CLIENT_SECRET,
        code: String(code),
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      console.error("OAuth token exchange failed:", await tokenRes.text());
      return res.redirect("/admin/config?mp=error&reason=token");
    }
    const { access_token, refresh_token, user_id, expires_in } = await safeJson(tokenRes, "token");

    // 2. Verificar que no sea cuenta de prueba
    const meRes = await fetch(`${MP_BASE}/users/me`, { headers: mpHeaders(access_token) });
    const me = await safeJson(meRes, "users/me");
    if (me.tags?.includes("test_user")) {
      return res.redirect("/admin/config?mp=error&reason=test_user");
    }

    const collectorId = String(user_id);
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // 3. Leer datos del negocio guardados antes del redirect
    const [rows] = await pool.query(
      "SELECT nombre_negocio, direccion, ciudad, provincia FROM config WHERE id = 1"
    );
    const cfg = (rows as any[])[0] ?? {};

    // 4. Geocodificar dirección
    let lat = -34.6037;
    let lng = -58.3816;
    try {
      const geoRes = await fetch(
        "https://nominatim.openstreetmap.org/search?" +
          new URLSearchParams({
            q: `${cfg.direccion}, ${cfg.ciudad}, ${cfg.provincia}, Argentina`,
            format: "json",
            limit: "1",
          }),
        { headers: { "User-Agent": "RadioCarlyApp/1.0" } }
      );
      const geoData = await geoRes.json();
      if (geoData[0]) {
        lat = parseFloat(geoData[0].lat);
        lng = parseFloat(geoData[0].lon);
      }
    } catch {}

    // 5. Crear sucursal (reusar si ya existe)
    const storeExternalId = `STORE${collectorId}`;
    let storeId: string;

    const storeCreateRes = await fetch(`${MP_BASE}/users/${collectorId}/stores`, {
      method: "POST",
      headers: mpHeaders(access_token),
      body: JSON.stringify({
        name: cfg.nombre_negocio,
        external_id: storeExternalId,
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
          street_name: cfg.direccion,
          street_number: "0",
          city_name: cfg.ciudad,
          state_name: cfg.provincia,
          latitude: lat,
          longitude: lng,
          reference: cfg.nombre_negocio,
        },
      }),
    });
    const storeCreate = await safeJson(storeCreateRes, "store POST");

    if (storeCreate.id) {
      storeId = String(storeCreate.id);
    } else if (storeCreate.status === 400) {
      // Ya existe — listar todas y filtrar por external_id
      const storeListRes = await fetch(
        `${MP_BASE}/users/${collectorId}/stores`,
        { headers: mpHeaders(access_token) }
      );
      const storeList = await safeJson(storeListRes, "store LIST");
      const results = storeList.results ?? storeList.data?.results ?? storeList;
      const found = Array.isArray(results)
        ? results.find((s: any) => s.external_id === storeExternalId)
        : null;
      if (!found?.id) {
        console.error("Store list:", JSON.stringify(storeList));
        return res.redirect("/admin/config?mp=error&reason=store");
      }
      storeId = String(found.id);
    } else {
      console.error("Store creation failed:", JSON.stringify(storeCreate));
      return res.redirect("/admin/config?mp=error&reason=store");
    }

    // 6. Crear caja POS (reusar si ya existe)
    const posExternalId = `CAJA${collectorId}`;
    let posId: string;

    const posCreateRes = await fetch(`${MP_BASE}/pos`, {
      method: "POST",
      headers: mpHeaders(access_token),
      body: JSON.stringify({
        name: "Caja Principal",
        external_id: posExternalId,
        store_id: storeId,
        fixed_amount: true,
      }),
    });
    const posCreate = await safeJson(posCreateRes, "pos POST");

    if (posCreate.id) {
      posId = String(posCreate.id);
    } else if (posCreate.status === 409) {
      // Ya existe — buscarlo por external_id
      const posListRes = await fetch(
        `${MP_BASE}/pos?external_id=${posExternalId}`,
        { headers: mpHeaders(access_token) }
      );
      const posList = await safeJson(posListRes, "pos LIST");
      const foundPos = posList.results?.[0] ?? posList[0];
      if (!foundPos?.id) {
        console.error("POS list:", JSON.stringify(posList));
        return res.redirect("/admin/config?mp=error&reason=pos");
      }
      posId = String(foundPos.id);
    } else {
      console.error("POS creation failed:", JSON.stringify(posCreate));
      return res.redirect("/admin/config?mp=error&reason=pos");
    }

    // 7. Guardar en DB
    await pool.query(
      `UPDATE config SET
        mp_access_token     = ?,
        mp_refresh_token    = ?,
        mp_collector_id     = ?,
        mp_pos_external_id  = ?,
        mp_token_expires_at = ?
      WHERE id = 1`,
      [access_token, refresh_token, collectorId, posExternalId, expiresAt]
    );

    invalidateMpConfig();

    return res.redirect("/admin/config?mp=ok");
  } catch (e: any) {
    console.error("OAuth callback error:", e.message);
    return res.redirect("/admin/config?mp=error&reason=unknown");
  }
}
