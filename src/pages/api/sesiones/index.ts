import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { getPrecioCliente } from '@/lib/precios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { idcliente, idprograma_horario, asistio } = req.body;
  if (!idcliente || !idprograma_horario || asistio === undefined) {
    return res.status(400).json({ error: 'idcliente, idprograma_horario y asistio son requeridos' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Obtener cliente y tipo_cobro con lock
    const [cliRows] = await conn.query(
      `SELECT c.idcliente, COALESCE(c.tipo_cobro, 'POR_PROGRAMA') AS tipo_cobro,
              COALESCE(ct.balance, 0) AS balance
       FROM clientes c
       LEFT JOIN ctacte ct ON ct.idcliente = c.idcliente
       WHERE c.idcliente = ? FOR UPDATE`,
      [idcliente]
    );
    const cliente = (cliRows as any[])[0];
    if (!cliente) {
      await conn.rollback();
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // 2. Verificar límite de deuda máxima
    const [configRows] = await conn.query('SELECT deuda_maxima FROM config LIMIT 1');
    const deudaMaxima = Number((configRows as any[])[0]?.deuda_maxima ?? 0);
    const balance = Number(cliente.balance ?? 0);
    if (deudaMaxima > 0 && balance >= deudaMaxima) {
      await conn.rollback();
      return res.status(403).json({
        error: 'deuda_maxima',
        mensaje: `Tenés una deuda de $${balance.toLocaleString('es-AR')} que supera el límite permitido. Pagá antes de continuar.`,
      });
    }

    // 3. Prevenir doble registro en el día
    const [existing] = await conn.query(
      `SELECT idsesion FROM sesiones WHERE idprograma_horario = ? AND fecha = CURDATE()`,
      [idprograma_horario],
    );
    if ((existing as any[]).length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: "ya_registrada", mensaje: "La asistencia ya fue registrada para este horario." });
    }

    // 4. Calcular precios según modalidad
    const hoy = new Date().toISOString().slice(0, 10);
    const precios = await getPrecioCliente(Number(idcliente), hoy);

    let monto = 0;
    if (cliente.tipo_cobro === 'MES_ADELANTADO') {
      if (asistio) {
        // En mes adelantado, la asistencia está incluida en la cuota fija
        monto = 0;
      } else {
        // Inasistencia en mes adelantado: auditar faltas del mes
        const [faltasRows] = await conn.query(
          `SELECT COUNT(*) AS faltas_mes
           FROM sesiones
           WHERE idcliente = ?
             AND asistio = 0
             AND MONTH(fecha) = MONTH(CURDATE())
             AND YEAR(fecha) = YEAR(CURDATE())`,
          [idcliente]
        );
        const faltasPrevias = Number((faltasRows as any[])[0]?.faltas_mes ?? 0);
        // 1ª inasistencia: 50% (0.5). 2ª o más: 100% (1.0)
        const multiplicador = faltasPrevias === 0 ? 0.5 : 1.0;
        monto = Math.round(precios.precio_hora * multiplicador * 100) / 100;
      }
    } else {
      // Modalidad POR_PROGRAMA estándar
      monto = asistio ? precios.precio_hora : precios.precio_reserva;
    }

    // 5. Insertar sesión
    await conn.query(
      `INSERT INTO sesiones (idcliente, idprograma_horario, fecha, asistio, monto)
       VALUES (?, ?, CURDATE(), ?, ?)`,
      [idcliente, idprograma_horario, asistio ? 1 : 0, monto],
    );

    // 6. Actualizar ctacte solo si monto > 0
    if (monto > 0) {
      await conn.query(
        `UPDATE ctacte
         SET egreso  = egreso + ?,
             balance = balance + ?
         WHERE idcliente = ?`,
        [monto, monto, idcliente],
      );
    }

    await conn.commit();
    res.status(201).json({ monto, tipo_cobro: cliente.tipo_cobro });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
