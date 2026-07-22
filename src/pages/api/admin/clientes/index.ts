import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const estado = String(req.query.estado ?? "activo");
    const filtroActivo =
      estado === "activo"   ? "WHERE c.activo = 1" :
      estado === "inactivo" ? "WHERE c.activo = 0" :
      "";

    const [rows] = await pool.query(
      `SELECT c.idcliente, c.dni, c.nombre, c.activo,
              COALESCE(ct.balance, 0) AS balance
       FROM clientes c
       LEFT JOIN ctacte ct ON ct.idcliente = c.idcliente
       ${filtroActivo}
       ORDER BY c.nombre ASC`,
    );
    return res.status(200).json(rows);
  }

  if (req.method === "POST") {
    const { dni, nombre, saldo_inicial, motivo_saldo } = req.body;
    if (!dni || !nombre) return res.status(400).json({ error: "dni y nombre son requeridos" });

    const saldo = Number(saldo_inicial ?? 0);
    const ingreso = saldo < 0 ? -saldo : 0;
    const egreso  = saldo > 0 ? saldo  : 0;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result]: any = await conn.query(
        "INSERT INTO clientes (dni, nombre) VALUES (?, ?)",
        [dni.trim(), nombre.trim()],
      );
      await conn.query(
        "INSERT INTO ctacte (idcliente, ingreso, egreso, balance) VALUES (?, ?, ?, ?)",
        [result.insertId, ingreso, egreso, saldo],
      );
      if (saldo !== 0) {
        await conn.query(
          "INSERT INTO pagos (idcliente, monto, estado, motivo) VALUES (?, ?, ?, ?)",
          [
            result.insertId,
            Math.abs(saldo),
            saldo > 0 ? "pendiente" : "aprobado",
            motivo_saldo?.trim() || (saldo > 0 ? "Deuda histórica" : "Saldo inicial a favor"),
          ],
        );
      }
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
