import type { NextApiRequest, NextApiResponse } from "next";
import { emitirFacturaPago, EmitirResultado } from "@/lib/arca";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { idpagos, idPago } = req.body;

  let ids: number[] = [];
  if (Array.isArray(idpagos)) {
    ids = idpagos.map((x) => Number(x)).filter((x) => x > 0);
  } else if (idPago) {
    const id = Number(idPago);
    if (id > 0) ids = [id];
  }

  if (ids.length === 0) {
    return res.status(400).json({ error: "Debe seleccionar al menos un pago para facturar." });
  }

  const resultados: EmitirResultado[] = [];

  // Emisión secuencial estricta para garantizar correlatividad en número de comprobante ARCA
  for (const id of ids) {
    try {
      const resEmision = await emitirFacturaPago(id);
      resultados.push(resEmision);
    } catch (err: any) {
      resultados.push({
        ok: false,
        idPago: id,
        error: err.message || "Error inesperado al emitir comprobante",
      });
    }
  }

  const exitosos = resultados.filter((r) => r.ok).length;
  const fallidos = resultados.filter((r) => !r.ok).length;

  return res.status(200).json({
    ok: fallidos === 0,
    total: ids.length,
    exitosos,
    fallidos,
    resultados,
  });
}
