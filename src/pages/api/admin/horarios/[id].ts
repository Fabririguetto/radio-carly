import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  if (req.method === "DELETE") {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query("DELETE FROM sesiones WHERE idhorario = ?", [id]);
      await conn.query("DELETE FROM horarios WHERE idhorario = ?", [id]);
      await conn.commit();
      return res.status(200).json({ ok: true });
    } catch (e: any) {
      await conn.rollback();
      return res.status(500).json({ error: e.message });
    } finally {
      conn.release();
    }
  }

  res.status(405).end();
}
