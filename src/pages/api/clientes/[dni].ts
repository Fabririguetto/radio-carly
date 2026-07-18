import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { dni } = req.query as { dni: string };

  const [rows] = await pool.query(
    `SELECT c.idcliente, c.dni, c.nombre,
            COALESCE(ct.balance, 0) AS balance
     FROM clientes c
     LEFT JOIN ctacte ct ON ct.idcliente = c.idcliente
     WHERE c.dni = ?`,
    [dni]
  );

  const clientes = rows as any[];
  if (clientes.length === 0) return res.status(404).json({ error: "Cliente no encontrado" });

  res.status(200).json(clientes[0]);
}
