import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const role = req.headers["x-user-role"] as string | undefined;

  if (req.method === "GET") {
    const estado = String(req.query.estado ?? "activo");
    const filtroActivo =
      estado === "activo"   ? "WHERE c.activo = 1" :
      estado === "inactivo" ? "WHERE c.activo = 0" :
      "";

    const [rows] = await pool.query(
      `SELECT c.idcliente, c.dni, c.nombre, c.activo,
              COALESCE(c.mp_enabled, 1) AS mp_enabled,
              COALESCE(c.tipo_cobro, 'POR_PROGRAMA') AS tipo_cobro,
              c.monto_mensual,
              COALESCE(ct.balance, 0) AS balance
       FROM clientes c
       LEFT JOIN ctacte ct ON ct.idcliente = c.idcliente
       ${filtroActivo}
       ORDER BY c.nombre ASC`,
    );

    const clientes = (rows as any[]).map((r) => {
      // Para rol OPERADOR, ocultar información financiera sensible (balances globales)
      const isOperador = role === "OPERADOR";
      return {
        idcliente: r.idcliente,
        dni: r.dni,
        nombre: r.nombre,
        activo: r.activo,
        mp_enabled: Number(r.mp_enabled),
        tipo_cobro: r.tipo_cobro,
        monto_mensual: isOperador ? null : (r.monto_mensual != null ? Number(r.monto_mensual) : null),
        balance: isOperador ? 0 : Number(r.balance),
      };
    });

    return res.status(200).json(clientes);
  }

  if (req.method === "POST") {
    if (role === "OPERADOR") {
      return res.status(403).json({ error: "No tenés permisos para crear clientes." });
    }

    const { dni, nombre, saldo_inicial, motivo_saldo, mp_enabled, tipo_cobro, monto_mensual } = req.body;
    if (!dni || !nombre) return res.status(400).json({ error: "dni y nombre son requeridos" });

    const saldo = Number(saldo_inicial ?? 0);
    const ingreso = saldo < 0 ? -saldo : 0;
    const egreso  = saldo > 0 ? saldo  : 0;

    const mpVal = mp_enabled === false || mp_enabled === 0 ? 0 : 1;
    const tipoCobroVal = tipo_cobro === "MES_ADELANTADO" ? "MES_ADELANTADO" : "POR_PROGRAMA";
    const montoMensualVal = tipoCobroVal === "MES_ADELANTADO" && monto_mensual ? Number(monto_mensual) : null;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result]: any = await conn.query(
        "INSERT INTO clientes (dni, nombre, mp_enabled, tipo_cobro, monto_mensual) VALUES (?, ?, ?, ?, ?)",
        [dni.trim(), nombre.trim(), mpVal, tipoCobroVal, montoMensualVal],
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
