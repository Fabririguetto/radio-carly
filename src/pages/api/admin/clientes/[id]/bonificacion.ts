import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { id } = req.query as { id: string };
  const { monto, motivo } = req.body;

  const montoNum = Number(monto);
  if (!monto || montoNum === 0 || !Number.isFinite(montoNum)) {
    return res.status(400).json({ error: "Monto inválido" });
  }
  if (!motivo?.trim()) {
    return res.status(400).json({ error: "El motivo es requerido" });
  }

  const esCredito = montoNum > 0;
  const abs = Math.abs(montoNum);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      "INSERT INTO pagos (idcliente, monto, estado, tipo, motivo) VALUES (?, ?, 'aprobado', ?, ?)",
      [id, abs, esCredito ? 'bonificacion' : 'cargo', motivo.trim()],
    );

    if (esCredito) {
      // Crédito: reduce la deuda
      await conn.query(
        "UPDATE ctacte SET ingreso = ingreso + ?, balance = balance - ? WHERE idcliente = ?",
        [abs, abs, id],
      );
    } else {
      // Cargo (ej. saldo inicial): aumenta la deuda
      await conn.query(
        "UPDATE ctacte SET egreso = egreso + ?, balance = balance + ? WHERE idcliente = ?",
        [abs, abs, id],
      );
    }

    await conn.commit();
    return res.status(201).json({ ok: true });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
