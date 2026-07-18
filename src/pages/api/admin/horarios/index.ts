import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const [rows] = await pool.query(
    `SELECT h.idhorario, h.dia_semana, h.hora_inicio, h.hora_fin,
            c.idcliente, c.nombre
     FROM horarios h
     JOIN clientes c ON c.idcliente = h.idcliente
     ORDER BY h.dia_semana, h.hora_inicio`
  );

  res.status(200).json(rows);
}
