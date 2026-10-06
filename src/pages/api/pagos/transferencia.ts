import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { idcliente, monto, comprobante, motivo } = req.body;
  const idclienteNum = parseInt(String(idcliente), 10);
  const montoNum     = Number(monto);

  if (!idclienteNum || idclienteNum <= 0) {
    return res.status(400).json({ error: "idcliente inválido" });
  }
  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    return res.status(400).json({ error: "monto inválido" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT idcliente, nombre FROM clientes WHERE idcliente = ?",
      [idclienteNum]
    );
    const cliente = (rows as any[])[0];
    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

    const comprobanteStr = comprobante ? String(comprobante).trim() : null;
    const motivoStr      = motivo ? String(motivo).trim() : `Transferencia bancaria — ${cliente.nombre}`;

    const [insertResult] = await pool.query(
      `INSERT INTO pagos (idcliente, monto, estado, tipo, motivo, comprobante_transferencia)
       VALUES (?, ?, 'pendiente', 'transferencia', ?, ?)`,
      [idclienteNum, montoNum, motivoStr, comprobanteStr]
    );

    const idpago = (insertResult as any).insertId;
    return res.status(201).json({ ok: true, idpago });
  } catch (err: any) {
    console.error("Error registrando pago por transferencia:", err);
    return res.status(500).json({ error: "Error interno al registrar la transferencia" });
  }
}
