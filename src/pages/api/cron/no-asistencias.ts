import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";
import { getPrecioCliente } from "@/lib/precios";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = req.headers["x-cron-secret"];
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Programas activos con horario para hoy cuya hora_fin ya pasó y no tienen sesión registrada
    const [pendientes] = await conn.query(
      `SELECT ph.idprograma_horario, p.idcliente, COALESCE(c.tipo_cobro, 'POR_PROGRAMA') AS tipo_cobro
       FROM programas p
       JOIN clientes c ON c.idcliente = p.idcliente
       JOIN programas_horarios ph ON ph.idprograma = p.idprograma
       WHERE p.activo = 1
         AND c.activo = 1
         AND p.fecha_inicio <= CURDATE()
         AND (p.fecha_fin IS NULL OR p.fecha_fin >= CURDATE())
         AND ph.dia_semana = (
           CASE DAYOFWEEK(CURDATE())
             WHEN 1 THEN 7
             ELSE DAYOFWEEK(CURDATE()) - 1
           END
         )
         AND ph.hora_fin < CURTIME()
         AND NOT EXISTS (
           SELECT 1 FROM sesiones s
           WHERE s.idprograma_horario = ph.idprograma_horario
             AND s.fecha = CURDATE()
         )
       FOR UPDATE`
    );

    const lista = pendientes as any[];
    if (lista.length === 0) {
      await conn.commit();
      return res.json({ ok: true, registrados: 0 });
    }

    const hoy = new Date().toISOString().slice(0, 10);

    for (const h of lista) {
      const precios = await getPrecioCliente(h.idcliente, hoy);
      let montoInasistencia = 0;

      if (h.tipo_cobro === 'MES_ADELANTADO') {
        // Contar inasistencias acumuladas en el mes calendario actual
        const [faltasRows] = await conn.query(
          `SELECT COUNT(*) AS faltas_mes
           FROM sesiones
           WHERE idcliente = ?
             AND asistio = 0
             AND MONTH(fecha) = MONTH(CURDATE())
             AND YEAR(fecha) = YEAR(CURDATE())`,
          [h.idcliente]
        );
        const faltasPrevias = Number((faltasRows as any[])[0]?.faltas_mes ?? 0);

        // 1ª inasistencia del mes: 50% (0.5). 2ª o subsiguientes: 100% (1.0)
        const multiplicador = faltasPrevias === 0 ? 0.5 : 1.0;
        montoInasistencia = Math.round(precios.precio_hora * multiplicador * 100) / 100;
      } else {
        // Modalidad POR_PROGRAMA: cobra precio reserva estándar
        montoInasistencia = precios.precio_reserva;
      }

      const [result] = await conn.query(
        `INSERT INTO sesiones (idcliente, idprograma_horario, fecha, asistio, monto)
         VALUES (?, ?, CURDATE(), 0, ?)
         ON DUPLICATE KEY UPDATE asistio = 0, monto = ?`,
        [h.idcliente, h.idprograma_horario, montoInasistencia, montoInasistencia]
      );

      // affectedRows = 1 → inserción nueva; 2 → ya existía (ON DUPLICATE KEY)
      if ((result as any).affectedRows === 1 && montoInasistencia > 0) {
        await conn.query(
          `UPDATE ctacte
           SET egreso = egreso + ?,
               balance = balance + ?
           WHERE idcliente = ?`,
          [montoInasistencia, montoInasistencia, h.idcliente]
        );
      }
    }

    await conn.commit();
    console.log(`Cron no-asistencias: ${lista.length} registros creados`);
    res.json({ ok: true, registrados: lista.length });
  } catch (e: any) {
    await conn.rollback();
    console.error("Cron no-asistencias error:", e.message);
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
}
