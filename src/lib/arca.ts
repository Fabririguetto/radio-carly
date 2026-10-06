import pool from "./db";

export interface AfipConfig {
  idConfig: number;
  cuit: string;
  puntoVenta: number;
  tipoComprobante: number;
  produccion: boolean;
  serviceUrl: string;
}

export interface EmitirResultado {
  ok: boolean;
  idPago: number;
  idComprobante?: number;
  nroComprobante?: number;
  cae?: string;
  caeVencimiento?: string;
  error?: string;
}

export async function getArcaConfig(): Promise<AfipConfig> {
  const [rows] = await pool.query(
    "SELECT id_config, cuit, punto_venta, tipo_comprobante, produccion, service_url FROM afip_config LIMIT 1"
  );
  const row = (rows as any[])[0];

  if (!row) {
    return {
      idConfig: 0,
      cuit: "",
      puntoVenta: 1,
      tipoComprobante: 11, // 11 = Factura C
      produccion: false,
      serviceUrl: process.env.ARCA_SERVICE_URL || "http://localhost:3001",
    };
  }

  return {
    idConfig: row.id_config,
    cuit: row.cuit,
    puntoVenta: Number(row.punto_venta) || 1,
    tipoComprobante: Number(row.tipo_comprobante) || 11,
    produccion: Boolean(row.produccion),
    serviceUrl: row.service_url || process.env.ARCA_SERVICE_URL || "http://localhost:3001",
  };
}

export async function checkArcaHealth(urlOverride?: string): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const config = await getArcaConfig();
    const baseUrl = (urlOverride || config.serviceUrl).replace(/\/$/, "");
    const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err: any) {
    return { ok: false, error: err.message || "No se pudo conectar con el microservicio ARCA" };
  }
}

export async function emitirFacturaPago(idPago: number): Promise<EmitirResultado> {
  const config = await getArcaConfig();
  if (!config.cuit) {
    throw new Error("No hay CUIT configurado para ARCA. Configurá los parámetros en Facturación.");
  }

  // 1. Obtener pago y datos del cliente
  const [pagoRows] = await pool.query(
    `SELECT p.idpago, p.monto, p.fecha, p.tipo, p.idcliente, p.estado,
            c.nombre, c.dni
     FROM pagos p
     JOIN clientes c ON c.idcliente = p.idcliente
     WHERE p.idpago = ?`,
    [idPago]
  );
  const pago = (pagoRows as any[])[0];

  if (!pago) {
    return { ok: false, idPago, error: "Pago no encontrado." };
  }

  if (pago.estado !== "aprobado") {
    return { ok: false, idPago, error: `El pago #${idPago} está en estado '${pago.estado}'. Solo se facturan pagos aprobados.` };
  }

  if (Number(pago.monto) <= 0) {
    return { ok: false, idPago, error: `El pago #${idPago} tiene monto $0 o bonificación.` };
  }

  // 2. Verificar si ya tiene comprobante emitido
  const [existentes] = await pool.query(
    "SELECT id_comprobante, cae, nro_comprobante, estado FROM comprobantes WHERE idpago = ? AND estado = 'emitido'",
    [idPago]
  );
  if ((existentes as any[]).length > 0) {
    const comp = (existentes as any[])[0];
    return {
      ok: true,
      idPago,
      idComprobante: comp.id_comprobante,
      cae: comp.cae,
      nroComprobante: comp.nro_comprobante,
      error: "El pago ya cuenta con comprobante emitido previamente.",
    };
  }

  // 3. Registrar comprobante en estado PENDIENTE
  const [insertComp] = await pool.query(
    `INSERT INTO comprobantes (idpago, idcliente, tipo_comprobante, punto_venta, estado, total)
     VALUES (?, ?, ?, ?, 'pendiente', ?)`,
    [pago.idpago, pago.idcliente, config.tipoComprobante, config.puntoVenta, Number(pago.monto)]
  );
  const idComprobante = (insertComp as any).insertId;

  // 4. Llamar al microservicio ARCA
  const baseUrl = config.serviceUrl.replace(/\/$/, "");
  const payload = {
    cuit:            config.cuit,
    produccion:      config.produccion,
    ptoVenta:        config.puntoVenta,
    tipoComprobante: config.tipoComprobante,
    idPago:          pago.idpago,
    total:           Number(pago.monto),
    tipoDocCodigo:   pago.dni ? "DNI" : "CF",
    nroDocumento:    pago.dni || "0",
  };

  try {
    const res = await fetch(`${baseUrl}/emitir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(45000), // 45 segundos para WSAA + WSFE
    });

    const body = await res.json().catch(() => ({}));

    if (res.ok && body.ok) {
      await pool.query(
        `UPDATE comprobantes SET
           cae             = ?,
           cae_vencimiento = ?,
           nro_comprobante = ?,
           estado          = 'emitido',
           error_msg       = NULL
         WHERE id_comprobante = ?`,
        [body.cae, body.caeVencimiento || null, body.nroComprobante, idComprobante]
      );

      return {
        ok: true,
        idPago,
        idComprobante,
        cae: body.cae,
        caeVencimiento: body.caeVencimiento,
        nroComprobante: body.nroComprobante,
      };
    } else {
      const errMsg = body.error || `Error HTTP ${res.status}: Fallo al comunicarse con ARCA`;
      await pool.query(
        "UPDATE comprobantes SET estado = 'error', error_msg = ? WHERE id_comprobante = ?",
        [errMsg, idComprobante]
      );
      return { ok: false, idPago, idComprobante, error: errMsg };
    }
  } catch (err: any) {
    const errMsg = err.message || "Error de conexión con el servicio de ARCA";
    await pool.query(
      "UPDATE comprobantes SET estado = 'error', error_msg = ? WHERE id_comprobante = ?",
      [errMsg, idComprobante]
    );
    return { ok: false, idPago, idComprobante, error: errMsg };
  }
}
