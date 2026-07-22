import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { desde, hasta } = req.query;
  if (!desde || !hasta) return res.status(400).json({ error: "desde y hasta requeridos" });

  const [rows] = await pool.query(
    `SELECT s.idprograma_horario, s.idcliente, s.fecha, s.asistio
     FROM sesiones s
     WHERE s.fecha BETWEEN ? AND ?
       AND s.idprograma_horario IS NOT NULL`,
    [desde, hasta],
  );

  return res.status(200).json(
    (rows as any[]).map((r) => ({
      idprograma_horario: r.idprograma_horario,
      idcliente: r.idcliente,
      fecha: r.fecha instanceof Date
        ? r.fecha.toISOString().slice(0, 10)
        : String(r.fecha).slice(0, 10),
      asistio: r.asistio,
    })),
  );
}
