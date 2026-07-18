import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";
import { invalidateMpConfig } from "@/lib/mp";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "DELETE") {
    try {
      await pool.query(
        `UPDATE config SET
          mp_access_token     = NULL,
          mp_refresh_token    = NULL,
          mp_token_expires_at = NULL,
          mp_collector_id     = NULL,
          mp_pos_external_id  = NULL
        WHERE id = 1`
      );
      invalidateMpConfig();
      return res.json({ ok: true });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method !== "GET") return res.status(405).end();

  try {
    const [rows] = await pool.query(
      "SELECT nombre_negocio, mp_collector_id, mp_pos_external_id, mp_access_token, mp_token_expires_at, direccion, ciudad, provincia FROM config LIMIT 1"
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
      mp_token_expires_at: row.mp_token_expires_at ?? null,
      direccion: row.direccion ?? "",
      ciudad: row.ciudad ?? "",
      provincia: row.provincia ?? "",
    });
  } catch (e: any) {
    console.error("mp-config GET error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
