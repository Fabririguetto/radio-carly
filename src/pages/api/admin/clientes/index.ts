import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const [rows] = await pool.query(
      `SELECT c.idcliente, c.dni, c.nombre,
              COALESCE(ct.balance, 0) AS balance
       FROM clientes c
       LEFT JOIN ctacte ct ON ct.idcliente = c.idcliente
       ORDER BY c.nombre ASC`
    );
    return res.status(200).json(rows);
  }

  if (req.method === "POST") {
    const { dni, nombre } = req.body;
    if (!dni || !nombre) return res.status(400).json({ error: "dni y nombre son requeridos" });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result]: any = await conn.query(
        "INSERT INTO clientes (dni, nombre) VALUES (?, ?)",
        [dni.trim(), nombre.trim()]
      );
      await conn.query(
        "INSERT INTO ctacte (idcliente, ingreso, egreso, balance) VALUES (?, 0, 0, 0)",
        [result.insertId]
      );
      await conn.commit();
      return res.status(201).json({ idcliente: result.insertId, dni, nombre });
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

  res.status(405).end();
}
