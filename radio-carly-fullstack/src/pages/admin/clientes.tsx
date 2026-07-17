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

  useEffect(() => {
    if (sessionStorage.getItem("admin") !== "1") {
      router.replace("/");
      return;
    }
    cargarClientes();
  }, []);

  async function cargarClientes() {
    const res = await fetch("/api/admin/clientes");
    setClientes(await res.json());
  }

  async function crearCliente() {
    if (!dni.trim() || !nombre.trim()) {
      setError("Completá DNI y nombre.");
      return;
    }
    setCargando(true);
    setError("");
    setExito("");
    const res = await fetch("/api/admin/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dni: dni.trim(), nombre: nombre.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
    } else {
      setExito(`Cliente "${nombre}" creado correctamente.`);
      setDni("");
      setNombre("");
      cargarClientes();
    }
    setCargando(false);
  }

  function toggleOrden(col: Columna) {
    if (columna === col) {
      setOrden((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setColumna(col);
      setOrden("asc");
    }
  }

  const clientesFiltrados = useMemo(() => {
    const q = filtro.toLowerCase().trim();
    const filtrados = q
      ? clientes.filter(
          (c) => c.nombre.toLowerCase().includes(q) || c.dni.includes(q)
        )
      : clientes;

    return [...filtrados].sort((a, b) => {
      let cmp = 0;
      if (columna === "nombre") cmp = a.nombre.localeCompare(b.nombre, "es");
      else if (columna === "dni") cmp = a.dni.localeCompare(b.dni);
      else if (columna === "balance") cmp = Number(a.balance) - Number(b.balance);
      return orden === "asc" ? cmp : -cmp;
    });
  }, [clientes, filtro, columna, orden]);

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-white font-bold text-2xl">Clientes</h1>
          <div className="flex gap-3">
            <Link href="/admin/horarios" className="text-gray-400 hover:text-white text-sm transition-colors">Calendario</Link>
            <Link href="/admin/config" className="text-gray-400 hover:text-white text-sm transition-colors">Precios</Link>
            <button onClick={() => { sessionStorage.removeItem("admin"); router.push("/"); }} className="text-gray-400 hover:text-red-400 text-sm transition-colors">Salir</button>
          </div>
        </div>

        {/* Formulario nuevo cliente */}
        <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
          <h2 className="text-white font-semibold">Nuevo cliente</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="DNI"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              className="flex-1 bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && crearCliente()}
              className="flex-1 bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={crearCliente}
              disabled={cargando}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              Agregar
            </button>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {exito && <p className="text-green-400 text-sm">{exito}</p>}
        </div>

        {/* Buscador */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nombre o DNI..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full bg-gray-900 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-2.5 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
          {filtro && (
            <button
              onClick={() => setFiltro("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-sm"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tabla */}
        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          {clientes.length === 0 ? (
            <p className="text-gray-500 text-sm p-5">No hay clientes registrados.</p>
          ) : clientesFiltrados.length === 0 ? (
            <p className="text-gray-500 text-sm p-5">Sin resultados para "{filtro}".</p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="bg-gray-800">
                  <tr>
                    <th
                      onClick={() => toggleOrden("nombre")}
                      className="text-left text-gray-400 px-4 py-3 font-medium cursor-pointer hover:text-white select-none transition-colors"
                    >
                      Nombre <IconoOrden activo={columna === "nombre"} orden={orden} />
                    </th>
                    <th
                      onClick={() => toggleOrden("dni")}
                      className="text-left text-gray-400 px-4 py-3 font-medium cursor-pointer hover:text-white select-none transition-colors"
                    >
                      DNI <IconoOrden activo={columna === "dni"} orden={orden} />
                    </th>
                    <th
                      onClick={() => toggleOrden("balance")}
                      className="text-right text-gray-400 px-4 py-3 font-medium cursor-pointer hover:text-white select-none transition-colors"
                    >
                      Deuda <IconoOrden activo={columna === "balance"} orden={orden} />
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map((c, i) => (
                    <tr key={c.idcliente} className={i % 2 === 0 ? "bg-gray-900" : "bg-gray-800/40"}>
                      <td className="text-white px-4 py-3">{c.nombre}</td>
                      <td className="text-gray-400 px-4 py-3">{c.dni}</td>
                      <td className={`text-right px-4 py-3 font-semibold ${Number(c.balance) > 0 ? "text-yellow-400" : "text-green-400"}`}>
                        ${Number(c.balance).toLocaleString("es-AR")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/clientes/${c.idcliente}`} className="text-blue-400 hover:text-blue-300 transition-colors">
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 border-t border-gray-800">
                <p className="text-gray-600 text-xs">
                  {clientesFiltrados.length} de {clientes.length} clientes
                </p>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
