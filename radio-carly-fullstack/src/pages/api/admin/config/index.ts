import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const [rows] = await pool.query("SELECT precio_hora, precio_reserva FROM config LIMIT 1");
    return res.status(200).json((rows as any[])[0]);
  }

  if (req.method === "PUT") {
    const { precio_hora, precio_reserva } = req.body;
    if (!precio_hora || !precio_reserva) {
      return res.status(400).json({ error: "precio_hora y precio_reserva son requeridos" });
    }
    await pool.query(
      "UPDATE config SET precio_hora = ?, precio_reserva = ? WHERE id = 1",
      [precio_hora, precio_reserva]
    );
    return res.status(200).json({ precio_hora, precio_reserva });
  }

  res.status(405).end();
}
