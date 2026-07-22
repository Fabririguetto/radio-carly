import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";

type Cliente = {
  idcliente: number;
  dni: string;
  nombre: string;
  balance: number;
  activo: number;
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
  const [dni, setDni] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [cargando, setCargando] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [columna, setColumna] = useState<Columna>("nombre");
  const [orden, setOrden] = useState<Orden>("asc");
  const [formAbierto, setFormAbierto] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("activo");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [motivoSaldo, setMotivoSaldo] = useState("");

  useEffect(() => {
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
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
    } else {
      setExito(`Cliente "${nombre}" creado.`);
      setDni(""); setNombre(""); setSaldoInicial(""); setMotivoSaldo("");
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
        <div className="pl-12">
          <h1 className="text-white font-bold text-xl">Clientes</h1>
        </div>

        {/* Botón nuevo cliente */}
        <button
          onClick={() => { setFormAbierto(!formAbierto); setError(""); setExito(""); }}
          className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors"
        >
          {formAbierto ? "Cancelar" : "+ Nuevo cliente"}
        </button>

        {/* Formulario nuevo cliente (expandible) */}
        {formAbierto && (
          <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
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
            <div className="border-t border-gray-800 pt-3 space-y-2">
              <p className="text-gray-500 text-xs">Saldo inicial (opcional)</p>
              <input
                type="number"
                placeholder="Ej: 5000 (deuda) o -3000 (a favor)"
                value={saldoInicial}
                onChange={(e) => setSaldoInicial(e.target.value)}
                className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {saldoInicial !== "" && Number(saldoInicial) !== 0 && (
                <input
                  type="text"
                  placeholder="Motivo del saldo inicial"
                  value={motivoSaldo}
                  onChange={(e) => setMotivoSaldo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && crearCliente()}
                  className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              {/* Cabecera ordenable — visible en tablet/desktop */}
              <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] bg-gray-800 px-4 py-2 text-xs text-gray-400 font-medium gap-4">
                <button onClick={() => toggleOrden("nombre")} className="text-left cursor-pointer hover:text-white select-none">
                  Nombre <IconoOrden activo={columna === "nombre"} orden={orden} />
                </button>
                <button onClick={() => toggleOrden("dni")} className="cursor-pointer hover:text-white select-none">
                  DNI <IconoOrden activo={columna === "dni"} orden={orden} />
                </button>
                <button onClick={() => toggleOrden("balance")} className="cursor-pointer hover:text-white select-none text-right">
                  Deuda <IconoOrden activo={columna === "balance"} orden={orden} />
                </button>
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
                      <p className="text-white font-medium">{c.nombre}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{c.dni}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold text-sm ${Number(c.balance) > 0 ? "text-yellow-400" : "text-green-400"}`}>
                        ${Number(c.balance).toLocaleString("es-AR")}
                      </span>
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
