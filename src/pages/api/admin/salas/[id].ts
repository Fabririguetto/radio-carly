import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  if (req.method === "PATCH") {
    const { nombre, activo } = req.body;
    if (nombre !== undefined) {
      if (!nombre.trim()) return res.status(400).json({ error: "nombre no puede estar vacío" });
      await pool.query("UPDATE salas SET nombre = ? WHERE idsala = ?", [nombre.trim(), id]);
    }
    if (activo !== undefined) {
      await pool.query("UPDATE salas SET activo = ? WHERE idsala = ?", [activo ? 1 : 0, id]);
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const [used]: any = await pool.query(
      "SELECT COUNT(*) AS cnt FROM horarios WHERE idsala = ?", [id]
    );
    if ((used as any[])[0].cnt > 0) {
      return res.status(409).json({ error: "La sala tiene horarios asignados. Reasignalos antes de eliminarla." });
    }
    await pool.query("DELETE FROM salas WHERE idsala = ?", [id]);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
