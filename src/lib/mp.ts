import pool from "./db";

export interface MpConfig {
  accessToken: string;
  collectorId: string;
  posExternalId: string;
  webhookSecret: string | null;
  nombreNegocio: string;
}

let cache: { config: MpConfig; expiresAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function refreshToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.MP_CLIENT_ID,
        client_secret: process.env.MP_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const newExpiry = new Date(Date.now() + data.expires_in * 1000);
    await pool.query(
      "UPDATE config SET mp_access_token = ?, mp_refresh_token = ?, mp_token_expires_at = ? WHERE id = 1",
      [data.access_token, data.refresh_token, newExpiry]
    );
    return data.access_token;
  } catch {
    return null;
  }
}

export async function getMpConfig(): Promise<MpConfig> {
  if (cache && Date.now() < cache.expiresAt) return cache.config;

  const [rows] = await pool.query(
    "SELECT mp_access_token, mp_refresh_token, mp_collector_id, mp_pos_external_id, mp_webhook_secret, nombre_negocio, mp_token_expires_at FROM config LIMIT 1"
  );
  const row = (rows as any[])[0] ?? {};

  let accessToken: string = row.mp_access_token ?? "";

  // Auto-refresh si vence en menos de 7 días
  if (accessToken && row.mp_refresh_token && row.mp_token_expires_at) {
    const expiresAt = new Date(row.mp_token_expires_at).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() > expiresAt - sevenDays) {
      const refreshed = await refreshToken(row.mp_refresh_token);
      if (refreshed) accessToken = refreshed;
    }
  }

  const config: MpConfig = {
    accessToken,
    collectorId:   row.mp_collector_id    ?? "",
    posExternalId: row.mp_pos_external_id ?? "",
    webhookSecret: row.mp_webhook_secret  ?? null,
    nombreNegocio: row.nombre_negocio     ?? "Mi Negocio",
  };

  cache = { config, expiresAt: Date.now() + CACHE_TTL };
  return config;
}

export function invalidateMpConfig() {
  cache = null;
}
