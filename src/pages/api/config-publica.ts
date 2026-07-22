import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  try {
    const [rows] = await pool.query("SELECT nombre_negocio FROM config LIMIT 1");
    const row = (rows as any[])[0];
    return res.status(200).json({ nombre_negocio: row?.nombre_negocio ?? "" });
  } catch {
    return res.status(200).json({ nombre_negocio: "" });
  }
}
