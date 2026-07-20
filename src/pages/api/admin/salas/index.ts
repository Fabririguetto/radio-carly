import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const [rows] = await pool.query(
      "SELECT idsala, nombre, activo FROM salas ORDER BY idsala"
    );
    return res.status(200).json(rows);
  }

  if (req.method === "POST") {
    const { nombre } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: "nombre es requerido" });
    const [result]: any = await pool.query(
      "INSERT INTO salas (nombre) VALUES (?)", [nombre.trim()]
    );
    return res.status(201).json({ idsala: result.insertId, nombre: nombre.trim(), activo: 1 });
  }

  res.status(405).end();
}
