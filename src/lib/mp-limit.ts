import pool from "./db";

export interface MpLimitStatus {
  limiteMensual: number; // 0 indica sin límite configurado
  totalConsumidoMes: number;
  alcanzado: boolean;
  restante: number;
}

export async function getMpLimitStatus(): Promise<MpLimitStatus> {
  const [cfgRows] = await pool.query(
    "SELECT mp_limite_mensual FROM config LIMIT 1"
  );
  const row = (cfgRows as any[])[0];
  const limite = row?.mp_limite_mensual != null ? Number(row.mp_limite_mensual) : 0;

  if (limite <= 0) {
    return {
      limiteMensual: 0,
      totalConsumidoMes: 0,
      alcanzado: false,
      restante: Infinity,
    };
  }

  // Suma de cobros aprobados con Mercado Pago durante el mes calendario actual
  const [sumRows] = await pool.query(
    `SELECT COALESCE(SUM(monto), 0) AS total_mp
     FROM pagos
     WHERE estado = 'aprobado'
       AND (tipo = 'qr' OR mp_payment_id IS NOT NULL)
       AND MONTH(fecha) = MONTH(CURRENT_DATE())
       AND YEAR(fecha) = YEAR(CURRENT_DATE())`
  );
  const consumido = Number((sumRows as any[])[0]?.total_mp || 0);
  const alcanzado = consumido >= limite;
  const restante = Math.max(0, limite - consumido);

  return {
    limiteMensual: limite,
    totalConsumidoMes: consumido,
    alcanzado,
    restante,
  };
}
