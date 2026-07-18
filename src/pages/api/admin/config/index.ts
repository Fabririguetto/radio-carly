import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const [rows] = await pool.query("SELECT precio_hora, precio_reserva FROM config LIMIT 1");
    const row = (rows as any[])[0];
    return res.status(200).json({
      precio_hora:    row?.precio_hora    ?? 0,
      precio_reserva: row?.precio_reserva ?? 0,
    });
  }

  if (req.method === "PUT") {
    const { precio_hora, precio_reserva } = req.body;
    if (!precio_hora || !precio_reserva) {
      return res.status(400).json({ error: "precio_hora y precio_reserva son requeridos" });
    }
    await pool.query(
      `INSERT INTO config (id, precio_hora, precio_reserva) VALUES (1, ?, ?)
       ON DUPLICATE KEY UPDATE precio_hora = VALUES(precio_hora), precio_reserva = VALUES(precio_reserva)`,
      [precio_hora, precio_reserva]
    );
    return res.status(200).json({ precio_hora, precio_reserva });
  }

  res.status(405).end();
}
