import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  if (req.method === "GET") {
    const [rows] = await pool.query(
      `SELECT idhorario, dia_semana, hora_inicio, hora_fin FROM horarios WHERE idcliente = ? ORDER BY dia_semana, hora_inicio`,
      [id]
    );
    const horarios = (rows as any[]).map((h) => ({ ...h, dia_nombre: DIAS[h.dia_semana] }));
    return res.status(200).json(horarios);
  }

  if (req.method === "POST") {
    const { dia_semana, hora_inicio, hora_fin } = req.body;
    if (!dia_semana || !hora_inicio || !hora_fin) {
      return res.status(400).json({ error: "dia_semana, hora_inicio y hora_fin son requeridos" });
    }
    if (hora_fin <= hora_inicio) {
      return res.status(400).json({ error: "La hora de fin debe ser posterior a la hora de inicio" });
    }

    // Verificar solapamiento global (ningún cliente puede tener el mismo horario ocupado)
    const [solapados]: any = await pool.query(
      `SELECT h.idhorario, c.nombre, h.hora_inicio, h.hora_fin
       FROM horarios h
       JOIN clientes c ON c.idcliente = h.idcliente
       WHERE h.dia_semana = ?
         AND h.hora_inicio < ?
         AND h.hora_fin > ?`,
      [dia_semana, hora_fin, hora_inicio]
    );
    if ((solapados as any[]).length > 0) {
      const s = solapados[0];
      const hi = String(s.hora_inicio).slice(0, 5);
      const hf = String(s.hora_fin).slice(0, 5);
      return res.status(409).json({ error: `Ocupado por ${s.nombre} (${hi}–${hf})` });
    }

    const [result]: any = await pool.query(
      "INSERT INTO horarios (idcliente, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)",
      [id, dia_semana, hora_inicio, hora_fin]
    );
    return res.status(201).json({ idhorario: result.insertId, idcliente: id, dia_semana, hora_inicio, hora_fin, dia_nombre: DIAS[dia_semana] });
  }

  res.status(405).end();
}
