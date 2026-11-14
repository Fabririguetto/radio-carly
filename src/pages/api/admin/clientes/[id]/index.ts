import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  const role = req.headers["x-user-role"] as string | undefined;

  if (req.method === "GET") {
    const isOperador = role === "OPERADOR";
    const [clienteRows] = await pool.query(
      `SELECT c.idcliente, c.dni, c.nombre, c.activo,
              COALESCE(c.mp_enabled, 1) AS mp_enabled,
              COALESCE(c.tipo_cobro, 'POR_PROGRAMA') AS tipo_cobro,
              c.monto_mensual,
              COALESCE(ct.ingreso, 0) AS ingreso,
              COALESCE(ct.egreso, 0)  AS egreso,
              COALESCE(ct.balance, 0) AS balance
       FROM clientes c
       LEFT JOIN ctacte ct ON ct.idcliente = c.idcliente
       WHERE c.idcliente = ?`,
      [id],
    );
    const rawCliente = (clienteRows as any[])[0];
    if (!rawCliente) return res.status(404).json({ error: "Cliente no encontrado" });

    const cliente = {
      ...rawCliente,
      mp_enabled: Number(rawCliente.mp_enabled),
      monto_mensual: isOperador ? null : (rawCliente.monto_mensual != null ? Number(rawCliente.monto_mensual) : null),
      ingreso: isOperador ? 0 : Number(rawCliente.ingreso),
      egreso: isOperador ? 0 : Number(rawCliente.egreso),
      balance: isOperador ? 0 : Number(rawCliente.balance),
    };

    const [sesiones] = await pool.query(
      `SELECT s.idsesion, s.fecha, s.asistio, s.monto,
              ph.hora_inicio, ph.hora_fin, ph.dia_semana
       FROM sesiones s
       LEFT JOIN programas_horarios ph ON ph.idprograma_horario = s.idprograma_horario
       WHERE s.idcliente = ?
       ORDER BY s.fecha DESC
       LIMIT 30`,
      [id],
    );

    const [pagos] = isOperador
      ? [[]]
      : await pool.query(
          `SELECT idpago, monto, estado, fecha FROM pagos
           WHERE idcliente = ? ORDER BY fecha DESC LIMIT 30`,
          [id],
        );

    return res.status(200).json({ cliente, sesiones, pagos });
  }

  if (req.method === "PATCH") {
    if (role === "OPERADOR") {
      return res.status(403).json({ error: "No tenés permisos para modificar clientes." });
    }

    const { activo, mp_enabled, tipo_cobro, monto_mensual } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (activo !== undefined) {
      updates.push("activo = ?");
      values.push(activo ? 1 : 0);
    }
    if (mp_enabled !== undefined) {
      updates.push("mp_enabled = ?");
      values.push(mp_enabled ? 1 : 0);
    }
    if (tipo_cobro !== undefined) {
      const tipoVal = tipo_cobro === "MES_ADELANTADO" ? "MES_ADELANTADO" : "POR_PROGRAMA";
      updates.push("tipo_cobro = ?");
      values.push(tipoVal);
    }
    if (monto_mensual !== undefined) {
      updates.push("monto_mensual = ?");
      values.push(monto_mensual != null && monto_mensual !== "" ? Number(monto_mensual) : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No se proporcionaron campos para actualizar." });
    }

    values.push(id);
    await pool.query(`UPDATE clientes SET ${updates.join(", ")} WHERE idcliente = ?`, values);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
