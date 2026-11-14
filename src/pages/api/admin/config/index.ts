import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { getMpLimitStatus } from '@/lib/mp-limit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Doble capa de seguridad backend: Bloqueo explícito a rol OPERADOR
  if (req.headers['x-user-role'] === 'OPERADOR') {
    return res.status(403).json({
      error: 'Acceso denegado: El perfil Operador no tiene permisos para consultar ni modificar la configuración del sistema.',
    });
  }

  if (req.method === 'GET') {
    const [rows] = await pool.query(
      `SELECT precio_hora, precio_reserva, deuda_maxima,
              mp_limite_mensual, transferencia_cbu, transferencia_alias,
              transferencia_titular, transferencia_banco,
              operador_dni,
              (operador_password IS NOT NULL AND operador_password != '') AS tiene_operador_password
       FROM config LIMIT 1`,
    );
    const row = (rows as any[])[0];
    const mpLimit = await getMpLimitStatus();

    return res.status(200).json({
      precio_hora:             row?.precio_hora              ?? 0,
      precio_reserva:          row?.precio_reserva           ?? 0,
      deuda_maxima:            row?.deuda_maxima             ?? 0,
      mp_limite_mensual:       row?.mp_limite_mensual        != null ? Number(row.mp_limite_mensual) : 0,
      mp_consumido_mes:        mpLimit.totalConsumidoMes,
      mp_bloqueado:            mpLimit.alcanzado,
      mp_restante:             mpLimit.restante,
      transferencia_cbu:       row?.transferencia_cbu        ?? '',
      transferencia_alias:     row?.transferencia_alias      ?? '',
      transferencia_titular:   row?.transferencia_titular    ?? '',
      transferencia_banco:     row?.transferencia_banco      ?? '',
      operador_dni:            row?.operador_dni             ?? '',
      tiene_operador_password: Boolean(row?.tiene_operador_password),
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
      operador_dni,
      operador_password,
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

    if (operador_dni !== undefined || (operador_password !== undefined && operador_password !== '')) {
      const updates: string[] = [];
      const values: any[] = [];

      if (operador_dni !== undefined) {
        updates.push('operador_dni = ?');
        values.push(operador_dni?.trim() || null);
      }
      if (operador_password !== undefined && operador_password !== '') {
        updates.push('operador_password = ?');
        values.push(operador_password?.trim());
      }

      if (updates.length > 0) {
        values.push(1);
        await pool.query(`UPDATE config SET ${updates.join(', ')} WHERE id = ?`, values);
      }
    }

    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
