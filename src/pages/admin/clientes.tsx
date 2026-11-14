import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";

type TipoCobro = "POR_PROGRAMA" | "MES_ADELANTADO";

type Cliente = {
  idcliente: number;
  dni: string;
  nombre: string;
  balance: number;
  activo: number;
  mp_enabled: number;
  tipo_cobro: TipoCobro;
  monto_mensual: number | null;
};

type EstadoFiltro = "activo" | "inactivo" | "todos";

type Columna = "nombre" | "dni" | "balance";
type Orden = "asc" | "desc";

function IconoOrden({ activo, orden }: { activo: boolean; orden: Orden }) {
  if (!activo) return <span className="text-gray-600 ml-1">↕</span>;
  return <span className="text-blue-400 ml-1">{orden === "asc" ? "↑" : "↓"}</span>;
}

export default function AdminClientes() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [role, setRole] = useState<"ADMIN" | "OPERADOR">("ADMIN");

  // Formulario nuevo cliente
  const [dni, setDni] = useState("");
  const [nombre, setNombre] = useState("");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [motivoSaldo, setMotivoSaldo] = useState("");
  const [mpEnabled, setMpEnabled] = useState(true);
  const [tipoCobro, setTipoCobro] = useState<TipoCobro>("POR_PROGRAMA");
  const [montoMensual, setMontoMensual] = useState("");

  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [cargando, setCargando] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [columna, setColumna] = useState<Columna>("nombre");
  const [orden, setOrden] = useState<Orden>("asc");
  const [formAbierto, setFormAbierto] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("activo");

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.role) setRole(d.role);
      })
      .catch(() => {});

    cargarClientes(estadoFiltro);
  }, []);

  async function cargarClientes(estado: EstadoFiltro) {
    const res = await fetch(`/api/admin/clientes?estado=${estado}`);
    if (res.status === 401) { router.replace("/admin"); return; }
    setClientes(await res.json());
  }

  function cambiarEstado(estado: EstadoFiltro) {
    setEstadoFiltro(estado);
    setFiltro("");
    cargarClientes(estado);
  }

  async function crearCliente() {
    if (!dni.trim() || !nombre.trim()) { setError("Completá DNI y nombre."); return; }
    if (tipoCobro === "MES_ADELANTADO" && (!montoMensual || Number(montoMensual) <= 0)) {
      setError("Para modalidad Mes Adelantado ingresá un monto mensual válido.");
      return;
    }

    setCargando(true);
    setError(""); setExito("");
    const res = await fetch("/api/admin/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dni: dni.trim(),
        nombre: nombre.trim(),
        saldo_inicial: saldoInicial !== "" ? Number(saldoInicial) : 0,
        motivo_saldo: motivoSaldo.trim() || undefined,
        mp_enabled: mpEnabled ? 1 : 0,
        tipo_cobro: tipoCobro,
        monto_mensual: tipoCobro === "MES_ADELANTADO" ? Number(montoMensual) : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
    } else {
      setExito(`Cliente "${nombre}" creado.`);
      setDni(""); setNombre(""); setSaldoInicial(""); setMotivoSaldo("");
      setMpEnabled(true); setTipoCobro("POR_PROGRAMA"); setMontoMensual("");
      setFormAbierto(false);
      cargarClientes(estadoFiltro);
    }
    setCargando(false);
  }

  function toggleOrden(col: Columna) {
    if (columna === col) setOrden((o) => (o === "asc" ? "desc" : "asc"));
    else { setColumna(col); setOrden("asc"); }
  }

  const clientesFiltrados = useMemo(() => {
    const q = filtro.toLowerCase().trim();
    const filtrados = q ? clientes.filter((c) => c.nombre.toLowerCase().includes(q) || c.dni.includes(q)) : clientes;
    return [...filtrados].sort((a, b) => {
      let cmp = 0;
      if (columna === "nombre") cmp = a.nombre.localeCompare(b.nombre, "es");
      else if (columna === "dni") cmp = a.dni.localeCompare(b.dni);
      else cmp = Number(a.balance) - Number(b.balance);
      return orden === "asc" ? cmp : -cmp;
    });
  }, [clientes, filtro, columna, orden]);

  return (
    <div className="min-h-[100dvh] bg-gray-950 px-4 py-6 pb-6 sm:pl-64">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Header */}
        <div className="pl-12 flex justify-between items-center">
          <h1 className="text-white font-bold text-xl">Clientes</h1>
        </div>

        {/* Botón nuevo cliente (solo Administrador) */}
        {role === "ADMIN" && (
          <button
            onClick={() => { setFormAbierto(!formAbierto); setError(""); setExito(""); }}
            className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors"
          >
            {formAbierto ? "Cancelar" : "+ Nuevo cliente"}
          </button>
        )}

        {/* Formulario nuevo cliente (expandible) */}
        {formAbierto && role === "ADMIN" && (
          <div className="bg-gray-900 rounded-2xl p-5 space-y-3 border border-gray-800">
            <input
              type="text"
              inputMode="numeric"
              placeholder="DNI"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Nombre completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Modalidad de cobro */}
            <div className="space-y-1 pt-1">
              <label className="text-gray-400 text-xs">Modalidad de cobro / liquidación</label>
              <select
                value={tipoCobro}
                onChange={(e) => setTipoCobro(e.target.value as TipoCobro)}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="POR_PROGRAMA">Por Programa / Sesión (Liquidación según asistencia)</option>
                <option value="MES_ADELANTADO">Mes Adelantado (Cuota mensual fija)</option>
              </select>
            </div>

            {/* Monto mensual si es MES_ADELANTADO */}
            {tipoCobro === "MES_ADELANTADO" && (
              <div className="space-y-1">
                <label className="text-gray-400 text-xs">Monto mensual pactado ($)</label>
                <input
                  type="number"
                  placeholder="Ej: 45000"
                  value={montoMensual}
                  onChange={(e) => setMontoMensual(e.target.value)}
                  className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            )}

            {/* Habilitación de Mercado Pago */}
            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer py-1 bg-gray-800/60 p-3 rounded-xl border border-gray-700/60">
                <input
                  type="checkbox"
                  checked={mpEnabled}
                  onChange={(e) => setMpEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-gray-800 border-gray-700"
                />
                <div>
                  <span className="text-sm text-white font-medium block">Habilitar cobro con Mercado Pago QR</span>
                  <span className="text-xs text-gray-400 block">Si se desactiva, solo podrá pagar por transferencia bancaria</span>
                </div>
              </label>
            </div>

            {/* Saldo inicial */}
            <div className="border-t border-gray-800 pt-3 space-y-2">
              <p className="text-gray-500 text-xs">Saldo inicial (opcional)</p>
              <input
                type="number"
                placeholder="Ej: 5000 (deuda) o -3000 (a favor)"
                value={saldoInicial}
                onChange={(e) => setSaldoInicial(e.target.value)}
                className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {saldoInicial !== "" && Number(saldoInicial) !== 0 && (
                <input
                  type="text"
                  placeholder="Motivo del saldo inicial"
                  value={motivoSaldo}
                  onChange={(e) => setMotivoSaldo(e.target.value)}
                  className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              )}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            {exito && <p className="text-green-400 text-sm">{exito}</p>}

            <button
              onClick={crearCliente}
              disabled={cargando}
              className="w-full bg-green-600 hover:bg-green-500 active:bg-green-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors"
            >
              {cargando ? "Guardando..." : "Guardar cliente"}
            </button>
          </div>
        )}

        {/* Filtro por estado */}
        <div className="flex gap-2">
          {(["activo", "inactivo", "todos"] as EstadoFiltro[]).map((e) => (
            <button
              key={e}
              onClick={() => cambiarEstado(e)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
                estadoFiltro === e
                  ? "bg-blue-600 text-white"
                  : "bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {e === "activo" ? "Activos" : e === "inactivo" ? "Inactivos" : "Todos"}
            </button>
          ))}
        </div>

        {/* Buscador */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nombre o DNI..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full bg-gray-900 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
          {filtro && (
            <button onClick={() => setFiltro("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">✕</button>
          )}
        </div>

        {/* Lista */}
        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          {clientes.length === 0 ? (
            <p className="text-gray-500 text-sm p-5">
              {estadoFiltro === "inactivo" ? "No hay clientes desactivados." : "No hay clientes registrados."}
            </p>
          ) : clientesFiltrados.length === 0 ? (
            <p className="text-gray-500 text-sm p-5">Sin resultados para "{filtro}".</p>
          ) : (
            <>
              {/* Cabecera ordenable */}
              <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] bg-gray-800 px-4 py-2 text-xs text-gray-400 font-medium gap-4">
                <button onClick={() => toggleOrden("nombre")} className="text-left cursor-pointer hover:text-white select-none">
                  Nombre <IconoOrden activo={columna === "nombre"} orden={orden} />
                </button>
                <button onClick={() => toggleOrden("dni")} className="cursor-pointer hover:text-white select-none">
                  DNI <IconoOrden activo={columna === "dni"} orden={orden} />
                </button>
                {role === "ADMIN" && (
                  <button onClick={() => toggleOrden("balance")} className="cursor-pointer hover:text-white select-none text-right">
                    Deuda <IconoOrden activo={columna === "balance"} orden={orden} />
                  </button>
                )}
                <span />
              </div>

              {/* Filas */}
              <div className="divide-y divide-gray-800">
                {clientesFiltrados.map((c) => (
                  <Link
                    key={c.idcliente}
                    href={`/admin/clientes/${c.idcliente}`}
                    className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-800/50 active:bg-gray-800 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{c.nombre}</p>
                        {c.tipo_cobro === "MES_ADELANTADO" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-700/30">
                            Mensual
                          </span>
                        )}
                        {Number(c.mp_enabled) === 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/30">
                            MP off
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5">{c.dni}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {role === "ADMIN" ? (
                        <span className={`font-bold text-sm ${Number(c.balance) > 0 ? "text-yellow-400" : "text-green-400"}`}>
                          ${Number(c.balance).toLocaleString("es-AR")}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">Ver ficha</span>
                      )}
                      <span className="text-gray-600 text-sm">›</span>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="px-4 py-2 border-t border-gray-800">
                <p className="text-gray-600 text-xs">{clientesFiltrados.length} de {clientes.length} clientes</p>
              </div>
            </>
          )}
        </div>

      </div>
      <AdminNav />
    </div>
  );
}
