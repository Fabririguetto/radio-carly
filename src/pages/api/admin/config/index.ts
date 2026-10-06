import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { getMpLimitStatus } from '@/lib/mp-limit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const [rows] = await pool.query(
      `SELECT precio_hora, precio_reserva, deuda_maxima,
              mp_limite_mensual, transferencia_cbu, transferencia_alias,
              transferencia_titular, transferencia_banco
       FROM config LIMIT 1`,
    );
    const row = (rows as any[])[0];
    const mpLimit = await getMpLimitStatus();

    return res.status(200).json({
      precio_hora:           row?.precio_hora           ?? 0,
      precio_reserva:        row?.precio_reserva        ?? 0,
      deuda_maxima:          row?.deuda_maxima          ?? 0,
      mp_limite_mensual:     row?.mp_limite_mensual     != null ? Number(row.mp_limite_mensual) : 0,
      mp_consumido_mes:      mpLimit.totalConsumidoMes,
      mp_bloqueado:          mpLimit.alcanzado,
      mp_restante:           mpLimit.restante,
      transferencia_cbu:     row?.transferencia_cbu     ?? '',
      transferencia_alias:   row?.transferencia_alias   ?? '',
      transferencia_titular: row?.transferencia_titular ?? '',
      transferencia_banco:   row?.transferencia_banco   ?? '',
    });
  }

  if (req.method === 'PUT') {
    const {
      precio_hora,
      precio_reserva,
      deuda_maxima,
      mp_limite_mensual,
      transferencia_cbu,
      transferencia_alias,
      transferencia_titular,
      transferencia_banco,
    } = req.body;

    if (precio_hora !== undefined && precio_reserva !== undefined) {
      if (!precio_hora || !precio_reserva) {
        return res.status(400).json({ error: 'precio_hora y precio_reserva son requeridos' });
      }

      await pool.query(
        `INSERT INTO config (id, precio_hora, precio_reserva, deuda_maxima) VALUES (1, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           precio_hora    = VALUES(precio_hora),
           precio_reserva = VALUES(precio_reserva),
           deuda_maxima   = VALUES(deuda_maxima)`,
        [precio_hora, precio_reserva, Number(deuda_maxima) || 0],
      );
    }

    if (
      mp_limite_mensual !== undefined ||
      transferencia_cbu !== undefined ||
      transferencia_alias !== undefined ||
      transferencia_titular !== undefined ||
      transferencia_banco !== undefined
    ) {
      const limiteNum = mp_limite_mensual !== null && mp_limite_mensual !== undefined && mp_limite_mensual !== ''
        ? Number(mp_limite_mensual)
        : null;

      await pool.query(
        `UPDATE config SET
           mp_limite_mensual     = ?,
           transferencia_cbu     = ?,
           transferencia_alias   = ?,
           transferencia_titular = ?,
           transferencia_banco   = ?
         WHERE id = 1`,
        [
          limiteNum,
          transferencia_cbu?.trim() || null,
          transferencia_alias?.trim() || null,
          transferencia_titular?.trim() || null,
          transferencia_banco?.trim() || null,
        ],
      );
    }

    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
