import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  if (req.method === "PATCH") {
    const { nombre, activo } = req.body;
    if (nombre !== undefined) {
      if (!nombre.trim()) return res.status(400).json({ error: "nombre no puede estar vacío" });
      await pool.query("UPDATE estudios SET nombre = ? WHERE idestudio = ?", [nombre.trim(), id]);
    }
    if (activo !== undefined) {
      await pool.query("UPDATE estudios SET activo = ? WHERE idestudio = ?", [activo ? 1 : 0, id]);
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const [used]: any = await pool.query(
      "SELECT COUNT(*) AS cnt FROM horarios WHERE idestudio = ?", [id]
    );
    if ((used as any[])[0].cnt > 0) {
      return res.status(409).json({ error: "El estudio tiene horarios asignados. Reasignalos antes de eliminarlo." });
    }
    await pool.query("DELETE FROM estudios WHERE idestudio = ?", [id]);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
