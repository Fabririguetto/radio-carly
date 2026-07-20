import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const [rows] = await pool.query(
    `SELECT h.idhorario, h.dia_semana, h.hora_inicio, h.hora_fin,
            c.idcliente, c.nombre,
            h.idsala, s.nombre AS sala_nombre
     FROM horarios h
     JOIN clientes c ON c.idcliente = h.idcliente
     LEFT JOIN salas s ON s.idsala = h.idsala
     ORDER BY h.dia_semana, h.hora_inicio`
  );

  res.status(200).json(rows);
}
