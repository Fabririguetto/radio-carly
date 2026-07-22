import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { id } = req.query as { id: string };
  const { monto, motivo } = req.body;

  if (!monto || Number(monto) <= 0) {
    return res.status(400).json({ error: "Monto inválido" });
  }
  if (!motivo?.trim()) {
    return res.status(400).json({ error: "El motivo es requerido" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Insertar pago manual a favor del cliente
    await conn.query(
      "INSERT INTO pagos (idcliente, monto, estado, motivo) VALUES (?, ?, 'aprobado', ?)",
      [id, Number(monto), motivo.trim()],
    );

    // Acreditar en cuenta corriente
    await conn.query(
      "UPDATE ctacte SET ingreso = ingreso + ?, balance = balance - ? WHERE idcliente = ?",
      [Number(monto), Number(monto), id],
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
