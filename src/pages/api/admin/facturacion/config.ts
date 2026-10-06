import type { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";
import { getArcaConfig } from "@/lib/arca";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const config = await getArcaConfig();
      return res.status(200).json(config);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "PUT") {
    const { cuit, puntoVenta, tipoComprobante, produccion, serviceUrl } = req.body;

    if (!cuit || !puntoVenta) {
      return res.status(400).json({ error: "CUIT y Punto de Venta son requeridos." });
    }

    try {
      await pool.query(
        `INSERT INTO afip_config (id_config, cuit, punto_venta, tipo_comprobante, produccion, service_url)
         VALUES (1, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           cuit             = VALUES(cuit),
           punto_venta      = VALUES(punto_venta),
           tipo_comprobante = VALUES(tipo_comprobante),
           produccion       = VALUES(produccion),
           service_url      = VALUES(service_url)`,
        [
          String(cuit).trim(),
          Number(puntoVenta) || 1,
          Number(tipoComprobante) || 11,
          produccion === true ? 1 : 0,
          String(serviceUrl || "http://localhost:3001").trim(),
        ]
      );
      return res.status(200).json({ ok: true, mensaje: "Configuración guardada correctamente." });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).end();
}
