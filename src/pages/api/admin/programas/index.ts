import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const { idcliente, fecha } = req.query;

    try {
      if (fecha) {
        const dia = new Date(String(fecha) + "T12:00:00").getDay();
        const [rows] = await pool.query(
          `SELECT p.idprograma, p.nombre, p.descripcion, p.dni_responsable,
                  p.fecha_inicio, p.fecha_fin, p.idcliente,
                  c.nombre AS cliente_nombre,
                  ph.idprograma_horario, ph.idestudio, ph.dia_semana,
                  ph.hora_inicio, ph.hora_fin,
                  e.nombre AS estudio_nombre
           FROM programas p
           JOIN clientes c ON c.idcliente = p.idcliente
           JOIN programas_horarios ph ON ph.idprograma = p.idprograma
           JOIN estudios e ON e.idestudio = ph.idestudio
           WHERE p.activo = 1
             AND p.fecha_inicio <= ?
             AND (p.fecha_fin IS NULL OR p.fecha_fin >= ?)
             AND ph.dia_semana = ?
           ORDER BY ph.hora_inicio ASC, e.nombre ASC`,
          [fecha, fecha, dia],
        );
        return res.status(200).json(rows);
      }

      const where = idcliente ? "WHERE p.idcliente = ?" : "WHERE p.activo = 1";
      const params = idcliente ? [idcliente] : [];

      const [programas] = await pool.query(
        `SELECT p.idprograma, p.idcliente, p.nombre, p.descripcion,
                p.dni_responsable, p.fecha_inicio, p.fecha_fin, p.activo,
                c.nombre AS cliente_nombre
         FROM programas p
         JOIN clientes c ON c.idcliente = p.idcliente
         ${where}
         ORDER BY p.fecha_inicio DESC`,
        params,
      );

      const ids = (programas as any[]).map((p) => p.idprograma);
      let horarios: any[] = [];
      if (ids.length > 0) {
        const [h] = await pool.query(
          `SELECT ph.*, e.nombre AS estudio_nombre
           FROM programas_horarios ph
           JOIN estudios e ON e.idestudio = ph.idestudio
           WHERE ph.idprograma IN (${ids.map(() => "?").join(",")})
           ORDER BY ph.dia_semana, ph.hora_inicio`,
          ids,
        );
        horarios = h as any[];
      }

      const result = (programas as any[]).map((p) => ({
        ...p,
        horarios: horarios.filter((h) => h.idprograma === p.idprograma),
      }));

      return res.status(200).json(result);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === "POST") {
    const { idcliente, nombre, descripcion, dni_responsable, fecha_inicio, fecha_fin, horarios } = req.body;
    if (!idcliente || !nombre || !fecha_inicio) {
      return res.status(400).json({ error: "idcliente, nombre y fecha_inicio son requeridos" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result]: any = await conn.query(
        `INSERT INTO programas (idcliente, nombre, descripcion, dni_responsable, fecha_inicio, fecha_fin)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [idcliente, nombre.trim(), descripcion?.trim() || null, dni_responsable?.trim() || null, fecha_inicio, fecha_fin || null],
      );
      const idprograma = result.insertId;

      if (Array.isArray(horarios)) {
        for (const h of horarios) {
          await conn.query(
            "INSERT INTO programas_horarios (idprograma, idestudio, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?, ?)",
            [idprograma, h.idestudio, h.dia_semana, h.hora_inicio, h.hora_fin],
          );
        }
      }

      await conn.commit();
      return res.status(201).json({ idprograma });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  if (req.method === "PUT") {
    const { idprograma, nombre, descripcion, dni_responsable, fecha_inicio, fecha_fin, activo, horarios } = req.body;
    if (!idprograma) return res.status(400).json({ error: "idprograma requerido" });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `UPDATE programas SET nombre=?, descripcion=?, dni_responsable=?, fecha_inicio=?, fecha_fin=?, activo=?
         WHERE idprograma=?`,
        [nombre.trim(), descripcion?.trim() || null, dni_responsable?.trim() || null, fecha_inicio, fecha_fin || null, activo ?? 1, idprograma],
      );

      if (Array.isArray(horarios)) {
        await conn.query("DELETE FROM programas_horarios WHERE idprograma = ?", [idprograma]);
        for (const h of horarios) {
          await conn.query(
            "INSERT INTO programas_horarios (idprograma, idestudio, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?, ?)",
            [idprograma, h.idestudio, h.dia_semana, h.hora_inicio, h.hora_fin],
          );
        }
      }

      await conn.commit();
      return res.status(200).json({ ok: true });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  if (req.method === "DELETE") {
    const { idprograma } = req.body;
    if (!idprograma) return res.status(400).json({ error: "idprograma requerido" });
    await pool.query("DELETE FROM programas WHERE idprograma = ?", [idprograma]);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
