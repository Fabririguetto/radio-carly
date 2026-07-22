import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const fecha = String(req.query.fecha ?? new Date().toISOString().slice(0, 10));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: "Formato de fecha inválido" });
    }

    try {
      const [rows] = await pool.query(
        `SELECT p.idpago, p.monto, p.fecha, p.tipo, p.motivo,
                c.nombre, c.dni
         FROM pagos p
         JOIN clientes c ON c.idcliente = p.idcliente
         WHERE p.estado = 'aprobado' AND DATE(p.fecha) = ?
         ORDER BY p.fecha DESC
         LIMIT 500`,
        [fecha],
      );

      const pagos = rows as any[];
      const total = pagos
        .filter((p) => p.tipo !== 'bonificacion')
        .reduce((s, p) => s + Number(p.monto), 0);
      return res.status(200).json({ pagos, total });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === "POST") {
    const { idcliente, monto, motivo } = req.body;
    if (!idcliente || !monto || Number(monto) <= 0) {
      return res.status(400).json({ error: "idcliente y monto son requeridos" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        "INSERT INTO pagos (idcliente, monto, estado, tipo, motivo) VALUES (?, ?, 'aprobado', 'manual', ?)",
        [idcliente, Number(monto), motivo?.trim() || null],
      );
      await conn.query(
        "UPDATE ctacte SET ingreso = ingreso + ?, balance = balance - ? WHERE idcliente = ?",
        [Number(monto), Number(monto), idcliente],
      );
      await conn.commit();
      return res.status(201).json({ ok: true });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  res.status(405).end();
}
