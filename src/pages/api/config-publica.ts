import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";
import { getMpLimitStatus } from "@/lib/mp-limit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  try {
    const [rows] = await pool.query(
      `SELECT nombre_negocio, transferencia_cbu, transferencia_alias,
              transferencia_titular, transferencia_banco
       FROM config LIMIT 1`
    );
    const row = (rows as any[])[0];
    const limitStatus = await getMpLimitStatus();

    return res.status(200).json({
      nombre_negocio: row?.nombre_negocio ?? "",
      mp_bloqueado: limitStatus.alcanzado,
      transferencia: {
        cbu: row?.transferencia_cbu ?? "",
        alias: row?.transferencia_alias ?? "",
        titular: row?.transferencia_titular ?? "",
        banco: row?.transferencia_banco ?? "",
      },
    });
  } catch {
    return res.status(200).json({
      nombre_negocio: "",
      mp_bloqueado: false,
      transferencia: { cbu: "", alias: "", titular: "", banco: "" },
    });
  }
}
