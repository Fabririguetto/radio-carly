import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { idcliente } = req.query as { idcliente: string };
  if (!idcliente) return res.status(400).json({ error: "idcliente requerido" });

  const [rows] = await pool.query(
    `SELECT s.idsesion, s.idhorario, s.fecha, s.asistio, s.monto,
            h.hora_inicio, h.hora_fin, h.dia_semana,
            h.idestudio, sa.nombre AS estudio_nombre
     FROM sesiones s
     JOIN horarios h ON h.idhorario = s.idhorario
     LEFT JOIN estudios sa ON sa.idestudio = h.idestudio
     WHERE s.idcliente = ? AND s.fecha = CURDATE()`,
    [idcliente]
  );

  const sesiones = rows as any[];

  if (sesiones.length === 0) {
    const [horarios] = await pool.query(
      `SELECT h.idhorario, h.hora_inicio, h.hora_fin, h.dia_semana,
              h.idsala, sa.nombre AS estudio_nombre
       FROM horarios h
       LEFT JOIN estudios sa ON sa.idestudio = h.idestudio
       WHERE h.idcliente = ?
         AND h.dia_semana = (
           CASE DAYOFWEEK(CURDATE())
             WHEN 1 THEN 7
             ELSE DAYOFWEEK(CURDATE()) - 1
           END
         )`,
      [idcliente]
    );

    const horariosArr = horarios as any[];

    // Buscar si algún horario está activo ahora (o en los próximos 15 min)
    const now = new Date();
    const nowMin = timeToMinutes(
      `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
    );

    const horarioActivo = horariosArr.find((h) => {
      const inicio = timeToMinutes(h.hora_inicio.slice(0, 5));
      const fin    = timeToMinutes(h.hora_fin.slice(0, 5));
      return nowMin >= inicio - 15 && nowMin <= fin;
    }) ?? null;

    return res.status(200).json({ sesion: null, horarios: horariosArr, horario_activo: horarioActivo });
  }

  res.status(200).json({ sesion: sesiones[0], horarios: [], horario_activo: null });
}
