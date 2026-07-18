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

export async function getMpConfig(): Promise<MpConfig> {
  if (cache && Date.now() < cache.expiresAt) return cache.config;

  const [rows] = await pool.query(
    "SELECT mp_access_token, mp_collector_id, mp_pos_external_id, mp_webhook_secret, nombre_negocio FROM config LIMIT 1"
  );
  const row = (rows as any[])[0] ?? {};

  const config: MpConfig = {
    accessToken:   row.mp_access_token    ?? process.env.MP_ACCESS_TOKEN    ?? "",
    collectorId:   row.mp_collector_id    ?? process.env.MP_COLLECTOR_ID    ?? "",
    posExternalId: row.mp_pos_external_id ?? process.env.MP_POS_EXTERNAL_ID ?? "",
    webhookSecret: row.mp_webhook_secret  ?? process.env.MP_WEBHOOK_SECRET  ?? null,
    nombreNegocio: row.nombre_negocio     ?? "Mi Negocio",
  };

  cache = { config, expiresAt: Date.now() + CACHE_TTL };
  return config;
}

export function invalidateMpConfig() {
  cache = null;
}
