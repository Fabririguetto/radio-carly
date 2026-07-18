import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";
import { invalidateMpConfig } from "@/lib/mp";

export const config = { api: { bodyParser: true } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { type, action, data } = req.body;

  if (type !== "mp-connect") return res.status(200).end();

  if (action === "application.deauthorized" && data?.id) {
    const collectorId = String(data.id);
    await pool.query(
      `UPDATE config SET
        mp_access_token     = NULL,
        mp_refresh_token    = NULL,
        mp_token_expires_at = NULL,
        mp_collector_id     = NULL,
        mp_pos_external_id  = NULL
      WHERE mp_collector_id = ?`,
      [collectorId]
    );
    invalidateMpConfig();
    console.log(`OAuth desvinculado para collector ${collectorId}`);
  }

  res.status(200).end();
}
