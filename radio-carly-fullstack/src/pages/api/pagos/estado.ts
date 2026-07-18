import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { preferenceId } = req.query;
  if (!preferenceId) return res.status(400).json({ error: "preferenceId requerido" });

  const [rows] = await pool.query(
    "SELECT estado FROM pagos WHERE mp_preference_id = ? LIMIT 1",
    [preferenceId]
  );
  const pago = (rows as any[])[0];
  if (!pago) return res.status(404).json({ error: "Pago no encontrado" });

  res.json({ estado: pago.estado });
}
