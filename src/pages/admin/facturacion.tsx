import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import AdminNav from "@/components/AdminNav";

type PagoPendiente = {
  idpago: number;
  monto: number;
  fecha: string;
  tipo: "qr" | "manual" | "transferencia";
  motivo: string | null;
  comprobante_transferencia?: string | null;
  idcliente: number;
  cliente_nombre: string;
  cliente_dni: string;
  id_comprobante?: number | null;
  estado_comprobante?: "pendiente" | "error" | null;
  error_msg?: string | null;
};

type Comprobante = {
  id_comprobante: number;
  idpago: number;
  tipo_comprobante: number;
  punto_venta: number;
  nro_comprobante: number | null;
  cae: string | null;
  cae_vencimiento: string | null;
  estado: "pendiente" | "emitido" | "error";
  total: number;
  error_msg: string | null;
  fecha_emision: string;
  cliente_nombre: string;
  cliente_dni: string;
  pago_tipo: string;
};

type ArcaConfig = {
  cuit: string;
  puntoVenta: number;
  tipoComprobante: number;
  produccion: boolean;
  serviceUrl: string;
};

const TIPO_CBTE_LABEL: Record<number, string> = {
  1:  "Factura A",
  6:  "Factura B",
  11: "Factura C",
};

const MEDIO_PAGO_LABEL: Record<string, string> = {
  qr:            "QR Mercado Pago",
  manual:        "Efectivo",
  transferencia: "Transferencia",
};

function fmt(n: number) {
  return `$${Number(n).toLocaleString("es-AR")}`;
}

function fmtFecha(iso: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminFacturacion() {
  const router = useRouter();
  const [tab, setTab] = useState<"pendientes" | "emitidos" | "config">("pendientes");

  // Pendientes
  const [pendientes, setPendientes] = useState<PagoPendiente[]>([]);
  const [cargandoPendientes, setCargandoPendientes] = useState(false);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [emitiendo, setEmitiendo] = useState(false);

  // Emitidos
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([]);
  const [cargandoComprobantes, setCargandoComprobantes] = useState(false);

  // Configuración
  const [config, setConfig] = useState<ArcaConfig>({
    cuit: "",
    puntoVenta: 1,
    tipoComprobante: 11,
    produccion: false,
    serviceUrl: "http://localhost:3001",
  });
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [probandoSalud, setProbandoSalud] = useState(false);
  const [saludResultado, setSaludResultado] = useState<{ ok: boolean; mensaje: string } | null>(null);

  // Mensajes de estado
  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeError, setMensajeError] = useState("");

  const cargarPendientes = useCallback(async () => {
    setCargandoPendientes(true);
    try {
      const res = await fetch("/api/admin/facturacion/pendientes");
      if (res.status === 401) { router.replace("/admin"); return; }
      const data = await res.json();
      setPendientes(data || []);
    } catch {
      setMensajeError("Error al cargar pagos pendientes.");
    } finally {
      setCargandoPendientes(false);
    }
  }, [router]);

  const cargarComprobantes = useCallback(async () => {
    setCargandoComprobantes(true);
    try {
      const res = await fetch("/api/admin/facturacion/comprobantes");
      if (res.status === 401) { router.replace("/admin"); return; }
      const data = await res.json();
      setComprobantes(data || []);
    } catch {
      setMensajeError("Error al cargar comprobantes emitidos.");
    } finally {
      setCargandoComprobantes(false);
    }
  }, [router]);

  const cargarConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/facturacion/config");
      if (res.status === 401) { router.replace("/admin"); return; }
      const data = await res.json();
      if (data) {
        setConfig({
          cuit: data.cuit || "",
          puntoVenta: data.puntoVenta || 1,
          tipoComprobante: data.tipoComprobante || 11,
          produccion: Boolean(data.produccion),
          serviceUrl: data.serviceUrl || "http://localhost:3001",
        });
      }
    } catch {
      // Ignorar error inicial
    }
  }, [router]);

  useEffect(() => {
    cargarPendientes();
    cargarComprobantes();
    cargarConfig();
  }, [cargarPendientes, cargarComprobantes, cargarConfig]);

  function toggleSeleccion(idpago: number) {
    setSeleccionados((prev) =>
      prev.includes(idpago) ? prev.filter((id) => id !== idpago) : [...prev, idpago]
    );
  }

  function toggleTodos() {
    if (seleccionados.length === pendientes.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(pendientes.map((p) => p.idpago));
    }
  }

  async function emitirSeleccionados() {
    if (seleccionados.length === 0) return;
    if (!confirm(`¿Emitir factura electrónica para ${seleccionados.length} ${seleccionados.length === 1 ? "pago" : "pagos"} ante ARCA?`)) return;

    setEmitiendo(true);
    setMensajeError("");
    setMensajeExito("");

    try {
      const res = await fetch("/api/admin/facturacion/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idpagos: seleccionados }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMensajeError(data.error || "Error al emitir comprobantes.");
      } else {
        if (data.fallidos === 0) {
          setMensajeExito(`¡${data.exitosos} ${data.exitosos === 1 ? "factura emitida" : "facturas emitidas"} con éxito con CAE!`);
        } else {
          setMensajeExito(`Emisión completada: ${data.exitosos} exitosas, ${data.fallidos} con error.`);
        }
        setSeleccionados([]);
        cargarPendientes();
        cargarComprobantes();
      }
    } catch {
      setMensajeError("Error de comunicación durante la emisión.");
    } finally {
      setEmitiendo(false);
    }
  }

  async function reintentarComprobante(idpago: number) {
    setEmitiendo(true);
    setMensajeError("");
    setMensajeExito("");

    try {
      const res = await fetch("/api/admin/facturacion/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idPago: idpago }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMensajeError(data.error || "Error al reintentar emisión.");
      } else {
        setMensajeExito("Comprobante reintentado con éxito.");
        cargarPendientes();
        cargarComprobantes();
      }
    } catch {
      setMensajeError("Error de conexión al reintentar comprobante.");
    } finally {
      setEmitiendo(false);
    }
  }

  async function guardarConfiguracion() {
    setGuardandoConfig(true);
    setMensajeError("");
    setMensajeExito("");

    try {
      const res = await fetch("/api/admin/facturacion/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();

      if (!res.ok) {
        setMensajeError(data.error || "Error al guardar configuración.");
      } else {
        setMensajeExito("Configuración de ARCA guardada exitosamente.");
      }
    } catch {
      setMensajeError("Error al conectar con el servidor.");
    } finally {
      setGuardandoConfig(false);
    }
  }

  async function probarConexion() {
    setProbandoSalud(true);
    setSaludResultado(null);

    try {
      const res = await fetch(`/api/admin/facturacion/health?url=${encodeURIComponent(config.serviceUrl)}`);
      const data = await res.json();

      if (res.ok && data.ok) {
        const certMsg = data.data?.hasCertificates
          ? "Servicio activo y certificados (.crt/.key) detectados."
          : "Servicio activo, pero NO se detectaron certificados .crt/.key aún.";
        setSaludResultado({ ok: true, mensaje: `Conexión exitosa: ${certMsg}` });
      } else {
        setSaludResultado({ ok: false, mensaje: data.error || "No se pudo conectar al microservicio ARCA." });
      }
    } catch (err: any) {
      setSaludResultado({ ok: false, mensaje: err.message || "Error al conectar con la URL especificada." });
    } finally {
      setProbandoSalud(false);
    }
  }

  const totalPendienteMonto = pendientes.reduce((s, p) => s + Number(p.monto), 0);
  const seleccionadosMonto = pendientes
    .filter((p) => seleccionados.includes(p.idpago))
    .reduce((s, p) => s + Number(p.monto), 0);

  return (
    <div className="min-h-[100dvh] bg-gray-950 px-4 py-6 pb-6 sm:pl-64">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pl-12 sm:pl-0">
          <div>
            <h1 className="text-white font-bold text-2xl flex items-center gap-2">
              <svg className="w-7 h-7 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              Facturación Electrónica ARCA
            </h1>
            <p className="text-gray-400 text-xs mt-0.5">
              Emisión de comprobantes autorizados con CAE conectado a ARCA / AFIP
            </p>
          </div>

          {/* Badge ambiente */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              config.produccion
                ? "bg-red-950 text-red-300 border border-red-800"
                : "bg-blue-950 text-blue-300 border border-blue-800"
            }`}>
              {config.produccion ? "Modo Producción" : "Modo Homologación"}
            </span>
          </div>
        </div>

        {/* Notificaciones de feedback */}
        {mensajeExito && (
          <div className="p-3.5 rounded-xl bg-green-950/60 border border-green-800 text-green-300 text-sm flex items-center justify-between">
            <span>{mensajeExito}</span>
            <button onClick={() => setMensajeExito("")} className="text-green-400 hover:text-white text-xs ml-2">✕</button>
          </div>
        )}
        {mensajeError && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-sm flex items-center justify-between">
            <span>{mensajeError}</span>
            <button onClick={() => setMensajeError("")} className="text-red-400 hover:text-white text-xs ml-2">✕</button>
          </div>
        )}

        {/* Pestañas de navegación */}
        <div className="flex border-b border-gray-800 space-x-1 sm:space-x-3">
          <button
            onClick={() => setTab("pendientes")}
            className={`py-3 px-3 sm:px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              tab === "pendientes"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Pendientes de Emisión
            {pendientes.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-600/30 text-blue-300 font-bold">
                {pendientes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("emitidos")}
            className={`py-3 px-3 sm:px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              tab === "emitidos"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Comprobantes Emitidos
            {comprobantes.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-300">
                {comprobantes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("config")}
            className={`py-3 px-3 sm:px-4 text-sm font-semibold border-b-2 transition-colors ${
              tab === "config"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Configuración ARCA
          </button>
        </div>

        {/* TAB 1: PENDIENTES DE EMISIÓN */}
        {tab === "pendientes" && (
          <div className="space-y-4">
            {/* Tarjeta resumen y acciones */}
            <div className="bg-gray-900 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide">Total pendiente de facturación</p>
                <p className="text-white font-bold text-2xl mt-1">{fmt(totalPendienteMonto)}</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {pendientes.length} {pendientes.length === 1 ? "cobro aprobado sin comprobante" : "cobros aprobados sin comprobante"}
                </p>
              </div>

              {pendientes.length > 0 && (
                <div className="flex items-center gap-3">
                  {seleccionados.length > 0 && (
                    <span className="text-xs text-blue-400 font-mono">
                      {seleccionados.length} selec. ({fmt(seleccionadosMonto)})
                    </span>
                  )}
                  <button
                    onClick={emitirSeleccionados}
                    disabled={emitiendo || seleccionados.length === 0}
                    className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center gap-2"
                  >
                    {emitiendo ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Emitiendo con ARCA...
                      </>
                    ) : (
                      `Emitir ${seleccionados.length > 0 ? `(${seleccionados.length})` : ""}`
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Listado de cobros */}
            <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
              {cargandoPendientes ? (
                <p className="text-gray-500 text-sm p-6 text-center">Cargando pagos pendientes...</p>
              ) : pendientes.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <p className="text-gray-300 font-medium">No hay cobros pendientes de facturación.</p>
                  <p className="text-gray-500 text-xs">Todos los pagos aprobados ya cuentan con su comprobante electrónico emitido.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-800/60 text-gray-400 text-xs uppercase font-medium border-b border-gray-800">
                      <tr>
                        <th className="p-3.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={seleccionados.length === pendientes.length && pendientes.length > 0}
                            onChange={toggleTodos}
                            className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-0 cursor-pointer"
                          />
                        </th>
                        <th className="p-3.5">Cliente</th>
                        <th className="p-3.5">Fecha Cobro</th>
                        <th className="p-3.5">Medio de Pago</th>
                        <th className="p-3.5 text-right">Monto</th>
                        <th className="p-3.5 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-gray-300">
                      {pendientes.map((p) => {
                        const isSelected = seleccionados.includes(p.idpago);
                        return (
                          <tr
                            key={p.idpago}
                            onClick={() => toggleSeleccion(p.idpago)}
                            className={`cursor-pointer hover:bg-gray-800/40 transition-colors ${
                              isSelected ? "bg-blue-950/20" : ""
                            }`}
                          >
                            <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSeleccion(p.idpago)}
                                className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-0 cursor-pointer"
                              />
                            </td>
                            <td className="p-3.5">
                              <p className="text-white font-medium">{p.cliente_nombre}</p>
                              <p className="text-gray-500 text-xs">DNI {p.cliente_dni || "Sin DNI"}</p>
                            </td>
                            <td className="p-3.5 text-xs text-gray-400">{fmtFecha(p.fecha)}</td>
                            <td className="p-3.5 text-xs">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-800 text-gray-300">
                                {MEDIO_PAGO_LABEL[p.tipo] || p.tipo}
                              </span>
                              {p.comprobante_transferencia && (
                                <p className="text-gray-500 text-[10px] mt-0.5 font-mono">Ref: {p.comprobante_transferencia}</p>
                              )}
                            </td>
                            <td className="p-3.5 text-right font-bold text-white">{fmt(p.monto)}</td>
                            <td className="p-3.5 text-center">
                              {p.estado_comprobante === "error" ? (
                                <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800" title={p.error_msg || ""}>
                                  Error previo
                                </span>
                              ) : (
                                <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-yellow-950 text-yellow-300 border border-yellow-800">
                                  Sin emitir
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: COMPROBANTES EMITIDOS */}
        {tab === "emitidos" && (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
              {cargandoComprobantes ? (
                <p className="text-gray-500 text-sm p-6 text-center">Cargando comprobantes...</p>
              ) : comprobantes.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <p className="text-gray-300 font-medium">Aún no se han emitido facturas con ARCA.</p>
                  <p className="text-gray-500 text-xs">Los comprobantes generados aparecerán aquí con su respectivo CAE y número asignado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-800/60 text-gray-400 text-xs uppercase font-medium border-b border-gray-800">
                      <tr>
                        <th className="p-3.5">Comprobante</th>
                        <th className="p-3.5">Cliente</th>
                        <th className="p-3.5">Fecha</th>
                        <th className="p-3.5">CAE / Vencimiento</th>
                        <th className="p-3.5 text-right">Total</th>
                        <th className="p-3.5 text-center">Estado</th>
                        <th className="p-3.5 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-gray-300">
                      {comprobantes.map((c) => {
                        const esEmitido = c.estado === "emitido";
                        const nroFormateado = c.nro_comprobante
                          ? `${String(c.punto_venta).padStart(4, "0")}-${String(c.nro_comprobante).padStart(8, "0")}`
                          : "-";

                        return (
                          <tr key={c.id_comprobante} className="hover:bg-gray-800/30 transition-colors">
                            <td className="p-3.5">
                              <p className="text-white font-medium text-xs font-mono">{nroFormateado}</p>
                              <p className="text-blue-400 text-[10px] uppercase font-semibold">
                                {TIPO_CBTE_LABEL[c.tipo_comprobante] || `Tipo ${c.tipo_comprobante}`}
                              </p>
                            </td>
                            <td className="p-3.5">
                              <p className="text-white font-medium text-xs">{c.cliente_nombre}</p>
                              <p className="text-gray-500 text-[11px]">DNI {c.cliente_dni || "CF"}</p>
                            </td>
                            <td className="p-3.5 text-xs text-gray-400">{fmtFecha(c.fecha_emision)}</td>
                            <td className="p-3.5 text-xs font-mono">
                              {c.cae ? (
                                <>
                                  <p className="text-green-400 font-semibold">{c.cae}</p>
                                  <p className="text-gray-500 text-[10px]">Vto: {c.cae_vencimiento || "-"}</p>
                                </>
                              ) : (
                                <p className="text-red-400 text-xs truncate max-w-xs" title={c.error_msg || ""}>
                                  {c.error_msg || "Fallo"}
                                </p>
                              )}
                            </td>
                            <td className="p-3.5 text-right font-bold text-white text-xs">{fmt(c.total)}</td>
                            <td className="p-3.5 text-center">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  esEmitido
                                    ? "bg-green-950 text-green-300 border border-green-800"
                                    : "bg-red-950 text-red-300 border border-red-800"
                                }`}
                              >
                                {c.estado}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              {!esEmitido && (
                                <button
                                  onClick={() => reintentarComprobante(c.idpago)}
                                  disabled={emitiendo}
                                  className="text-xs px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white transition-colors disabled:opacity-50"
                                >
                                  Reintentar
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CONFIGURACIÓN */}
        {tab === "config" && (
          <div className="bg-gray-900 rounded-2xl p-5 sm:p-6 space-y-6 max-w-2xl border border-gray-800">
            <div>
              <h2 className="text-white font-semibold text-lg">Parámetros de ARCA (ex-AFIP)</h2>
              <p className="text-gray-400 text-xs mt-1">
                Configurá el CUIT y los datos de facturación para la comunicación electrónica directa.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-gray-400 text-xs">CUIT Emisor (sin guiones)</label>
                  <input
                    type="text"
                    value={config.cuit}
                    onChange={(e) => setConfig({ ...config, cuit: e.target.value })}
                    placeholder="Ej: 20381234567"
                    className="w-full bg-gray-800 text-white font-mono border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-400 text-xs">Punto de Venta</label>
                  <input
                    type="number"
                    min="1"
                    value={config.puntoVenta}
                    onChange={(e) => setConfig({ ...config, puntoVenta: Number(e.target.value) || 1 })}
                    className="w-full bg-gray-800 text-white font-mono border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-gray-400 text-xs">Tipo de Comprobante</label>
                  <select
                    value={config.tipoComprobante}
                    onChange={(e) => setConfig({ ...config, tipoComprobante: Number(e.target.value) })}
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={11}>Factura C (Monotributo - Predeterminado)</option>
                    <option value={6}>Factura B (Resp. Inscripto a Consumidor Final)</option>
                    <option value={1}>Factura A (Resp. Inscripto a Resp. Inscripto)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-gray-400 text-xs">Entorno / Ambiente</label>
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, produccion: false })}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                        !config.produccion
                          ? "bg-blue-600/30 border-blue-500 text-blue-300"
                          : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                      }`}
                    >
                      Homologación (Test)
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, produccion: true })}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors ${
                        config.produccion
                          ? "bg-red-600/30 border-red-500 text-red-300"
                          : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                      }`}
                    >
                      Producción
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-gray-400 text-xs">URL del Microservicio ARCA</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={config.serviceUrl}
                    onChange={(e) => setConfig({ ...config, serviceUrl: e.target.value })}
                    placeholder="http://localhost:3001"
                    className="flex-1 bg-gray-800 text-white font-mono border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={probarConexion}
                    disabled={probandoSalud}
                    className="shrink-0 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 border border-gray-700 text-gray-200 px-4 py-3 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    {probandoSalud ? "Probando..." : "Probar Conexión"}
                  </button>
                </div>
                <p className="text-gray-500 text-[11px]">
                  Puede ser la instancia local (`http://localhost:3001`) o la URL del servicio compartido de Gestion Web desplegado en Railway/Render.
                </p>

                {saludResultado && (
                  <div
                    className={`mt-2 p-3 rounded-xl text-xs flex items-center gap-2 ${
                      saludResultado.ok
                        ? "bg-green-950/60 border border-green-800 text-green-300"
                        : "bg-red-950/60 border border-red-800 text-red-300"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${saludResultado.ok ? "bg-green-400" : "bg-red-400"}`} />
                    {saludResultado.mensaje}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={guardarConfiguracion}
                disabled={guardandoConfig}
                className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors text-base"
              >
                {guardandoConfig ? "Guardando..." : "Guardar Configuración"}
              </button>
            </div>
          </div>
        )}

      </div>
      <AdminNav />
    </div>
  );
}
