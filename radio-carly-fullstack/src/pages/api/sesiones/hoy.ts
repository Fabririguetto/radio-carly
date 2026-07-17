import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { idcliente } = req.query as { idcliente: string };
  if (!idcliente) return res.status(400).json({ error: "idcliente requerido" });

  // dia_semana en MySQL: 1=domingo ... 7=sábado — usamos DAYOFWEEK
  // Nuestra convención: 1=lunes ... 7=domingo, entonces convertimos
  const [rows] = await pool.query(
    `SELECT s.idsesion, s.idhorario, s.fecha, s.asistio, s.monto,
            h.hora_inicio, h.hora_fin, h.dia_semana
     FROM sesiones s
     JOIN horarios h ON h.idhorario = s.idhorario
     WHERE s.idcliente = ? AND s.fecha = CURDATE()`,
    [idcliente]
  );

  const sesiones = rows as any[];

  // Si no hay sesión creada hoy, buscamos si tiene horario para hoy
  if (sesiones.length === 0) {
    const [horarios] = await pool.query(
      `SELECT h.idhorario, h.hora_inicio, h.hora_fin, h.dia_semana
       FROM horarios h
       WHERE h.idcliente = ?
         AND h.dia_semana = (
           -- Convertir DAYOFWEEK (1=dom) a nuestra conv (1=lun..7=dom)
           CASE DAYOFWEEK(CURDATE())
             WHEN 1 THEN 7
             ELSE DAYOFWEEK(CURDATE()) - 1
           END
         )`,
      [idcliente]
    );

    return res.status(200).json({ sesion: null, horarios: horarios });
  }

  res.status(200).json({ sesion: sesiones[0], horarios: [] });
}
