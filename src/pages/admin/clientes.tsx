import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

type Cliente = {
  idcliente: number;
  dni: string;
  nombre: string;
  balance: number;
};

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

  useEffect(() => {
    if (sessionStorage.getItem("admin") !== "1") { router.replace("/"); return; }
    cargarClientes();
  }, []);

  async function cargarClientes() {
    const res = await fetch("/api/admin/clientes");
    setClientes(await res.json());
  }

  async function crearCliente() {
    if (!dni.trim() || !nombre.trim()) { setError("Completá DNI y nombre."); return; }
    setCargando(true);
    setError(""); setExito("");
    const res = await fetch("/api/admin/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dni: dni.trim(), nombre: nombre.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
    } else {
      setExito(`Cliente "${nombre}" creado.`);
      setDni(""); setNombre("");
      setFormAbierto(false);
      cargarClientes();
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
    <div className="min-h-[100dvh] bg-gray-950 px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-white font-bold text-xl">Clientes</h1>
          <div className="flex items-center gap-1">
            <Link href="/admin/horarios" title="Calendario"
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
              </svg>
            </Link>
            <Link href="/admin/config" title="Configuración"
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </Link>
            <Link href="/admin/ayuda" title="Ayuda"
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
              </svg>
            </Link>
            <button onClick={() => { sessionStorage.removeItem("admin"); router.push("/"); }} title="Salir"
              className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-gray-800 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
              </svg>
            </button>
          </div>
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
              onKeyDown={(e) => e.key === "Enter" && crearCliente()}
              className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
            <p className="text-gray-500 text-sm p-5">No hay clientes registrados.</p>
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
    </div>
  );
}
