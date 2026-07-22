import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { idcliente } = req.query as { idcliente: string };
  if (!idcliente) return res.status(400).json({ error: "idcliente requerido" });

  const [rows] = await pool.query(
    `SELECT
       ph.idprograma_horario, ph.hora_inicio, ph.hora_fin,
       e.nombre AS estudio_nombre,
       p.nombre AS programa_nombre,
       s.idsesion, s.asistio, s.monto AS sesion_monto
     FROM programas p
     JOIN programas_horarios ph ON ph.idprograma = p.idprograma
     LEFT JOIN estudios e ON e.idestudio = ph.idestudio
     LEFT JOIN sesiones s
            ON s.idprograma_horario = ph.idprograma_horario
           AND s.fecha = CURDATE()
     WHERE p.idcliente = ?
       AND p.activo = 1
       AND p.fecha_inicio <= CURDATE()
       AND (p.fecha_fin IS NULL OR p.fecha_fin >= CURDATE())
       AND ph.dia_semana = (
         CASE DAYOFWEEK(CURDATE())
           WHEN 1 THEN 7
           ELSE DAYOFWEEK(CURDATE()) - 1
         END
       )
     ORDER BY ph.hora_inicio`,
    [idcliente],
  );

  const horarios = (rows as any[]).map((r) => ({
    idprograma_horario: r.idprograma_horario,
    hora_inicio:        r.hora_inicio,
    hora_fin:           r.hora_fin,
    estudio_nombre:     r.estudio_nombre ?? null,
    programa_nombre:    r.programa_nombre ?? null,
    sesion: r.idsesion != null
      ? { idsesion: r.idsesion, asistio: r.asistio, monto: Number(r.sesion_monto) }
      : null,
  }));

  res.status(200).json({ horarios });
}
