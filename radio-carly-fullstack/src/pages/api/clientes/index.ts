import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { dni: dniMaestro } = req.headers as { dni: string };
  if (dniMaestro !== process.env.MASTER_DNI) {
    return res.status(403).json({ error: "No autorizado" });
  }

  const { dni, nombre } = req.body;
  if (!dni || !nombre) return res.status(400).json({ error: "dni y nombre son requeridos" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result]: any = await conn.query(
      "INSERT INTO clientes (dni, nombre) VALUES (?, ?)",
      [dni, nombre]
    );
    const idcliente = result.insertId;

    await conn.query(
      "INSERT INTO ctacte (idcliente, ingreso, egreso, balance) VALUES (?, 0, 0, 0)",
      [idcliente]
    );

    await conn.commit();
    res.status(201).json({ idcliente, dni, nombre });
  } catch (error: any) {
    await conn.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "El DNI ya está registrado" });
    }
    throw error;
  } finally {
    conn.release();
  }
}
