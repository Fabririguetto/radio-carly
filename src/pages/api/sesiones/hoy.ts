import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { idcliente } = req.query as { idcliente: string };
  if (!idcliente) return res.status(400).json({ error: "idcliente requerido" });

  const [rows] = await pool.query(
    `SELECT
       h.idhorario, h.hora_inicio, h.hora_fin,
       e.nombre AS estudio_nombre,
       s.idsesion, s.asistio, s.monto AS sesion_monto
     FROM horarios h
     LEFT JOIN estudios e ON e.idestudio = h.idestudio
     LEFT JOIN sesiones s
            ON s.idhorario = h.idhorario
           AND s.idcliente = h.idcliente
           AND s.fecha = CURDATE()
     WHERE h.idcliente = ?
       AND h.dia_semana = (
         CASE DAYOFWEEK(CURDATE())
           WHEN 1 THEN 7
           ELSE DAYOFWEEK(CURDATE()) - 1
         END
       )
     ORDER BY h.hora_inicio`,
    [idcliente],
  );

  const horarios = (rows as any[]).map((r) => ({
    idhorario:      r.idhorario,
    hora_inicio:    r.hora_inicio,
    hora_fin:       r.hora_fin,
    estudio_nombre: r.estudio_nombre ?? null,
    sesion: r.idsesion != null
      ? { idsesion: r.idsesion, asistio: r.asistio, monto: Number(r.sesion_monto) }
      : null,
  }));

  res.status(200).json({ horarios });
}
