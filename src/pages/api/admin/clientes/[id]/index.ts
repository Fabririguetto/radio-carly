import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  if (req.method === "GET") {
    const [clienteRows] = await pool.query(
      `SELECT c.idcliente, c.dni, c.nombre, c.activo,
              COALESCE(ct.ingreso, 0) AS ingreso,
              COALESCE(ct.egreso, 0)  AS egreso,
              COALESCE(ct.balance, 0) AS balance
       FROM clientes c
       LEFT JOIN ctacte ct ON ct.idcliente = c.idcliente
       WHERE c.idcliente = ?`,
      [id],
    );
    const cliente = (clienteRows as any[])[0];
    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

    const [sesiones] = await pool.query(
      `SELECT s.idsesion, s.fecha, s.asistio, s.monto,
              h.hora_inicio, h.hora_fin, h.dia_semana
       FROM sesiones s
       JOIN horarios h ON h.idhorario = s.idhorario
       WHERE s.idcliente = ?
       ORDER BY s.fecha DESC
       LIMIT 30`,
      [id],
    );

    const [pagos] = await pool.query(
      `SELECT idpago, monto, estado, fecha FROM pagos
       WHERE idcliente = ? ORDER BY fecha DESC LIMIT 30`,
      [id],
    );

    return res.status(200).json({ cliente, sesiones, pagos });
  }

  if (req.method === "PATCH") {
    const { activo } = req.body;
    if (activo === undefined) return res.status(400).json({ error: "activo es requerido" });
    await pool.query("UPDATE clientes SET activo = ? WHERE idcliente = ?", [activo ? 1 : 0, id]);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
