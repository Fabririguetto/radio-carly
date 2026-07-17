import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  if (req.method === "DELETE") {
    await pool.query("DELETE FROM horarios WHERE idhorario = ?", [id]);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
