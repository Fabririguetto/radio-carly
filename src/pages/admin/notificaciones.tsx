import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminNav from "@/components/AdminNav";

type Notif = {
  idnotificacion: number;
  titulo: string;
  texto: string;
  tipo: "general" | "aumento_cuota";
  precio_nuevo: number | null;
  fecha_inicio: string;
  fecha_expiracion: string;
  para_todos: number;
  destinatarios: number;
  creada_at: string;
};

type Cliente = { idcliente: number; nombre: string; dni: string };

function fmtFecha(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminNotificaciones() {
  const router = useRouter();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [cargando, setCargando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // Form state
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState<"general" | "aumento_cuota">("general");
  const [precioNuevo, setPrecioNuevo] = useState("");
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().slice(0, 10));
  const [fechaExp, setFechaExp] = useState("");
  const [paraTodos, setParaTodos] = useState(true);
  const [clientesSelec, setClientesSelec] = useState<number[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/admin/notificaciones");
    if (res.status === 401) { router.replace("/admin"); return; }
    setNotifs(await res.json());
    setCargando(false);
  }

  async function abrirModal() {
    setError(""); setTitulo(""); setTexto(""); setTipo("general");
    setPrecioNuevo(""); setParaTodos(true); setClientesSelec([]);
    setFechaInicio(new Date().toISOString().slice(0, 10)); setFechaExp("");
    if (clientes.length === 0) {
      const res = await fetch("/api/admin/clientes?estado=activo");
      setClientes(await res.json());
    }
    setModalAbierto(true);
  }

  async function guardar() {
    if (!titulo.trim() || !texto.trim() || !fechaInicio || !fechaExp) {
      setError("Completá todos los campos obligatorios."); return;
    }
    if (!paraTodos && clientesSelec.length === 0) {
      setError("Seleccioná al menos un cliente."); return;
    }
    setGuardando(true); setError("");
    const res = await fetch("/api/admin/notificaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo, texto, tipo,
        precio_nuevo: tipo === "aumento_cuota" && precioNuevo ? Number(precioNuevo) : null,
        fecha_inicio: fechaInicio, fecha_expiracion: fechaExp,
        para_todos: paraTodos, clientes: paraTodos ? [] : clientesSelec,
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Error al guardar.");
    } else {
      setModalAbierto(false);
      cargar();
    }
    setGuardando(false);
  }

  async function eliminar(idnotificacion: number) {
    if (!confirm("¿Eliminás esta notificación?")) return;
    await fetch("/api/admin/notificaciones", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idnotificacion }),
    });
    cargar();
  }

  function toggleCliente(id: number) {
    setClientesSelec((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-[100dvh] bg-gray-950 px-4 py-6 pb-6 sm:pl-64">
      <div className="max-w-2xl mx-auto space-y-4">

        <div className="pl-12">
          <h1 className="text-white font-bold text-xl">Notificaciones</h1>
        </div>

        <button
          onClick={abrirModal}
          className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors"
        >
          + Nueva notificación
        </button>

        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          {cargando ? (
            <p className="text-gray-500 text-sm p-5">Cargando...</p>
          ) : notifs.length === 0 ? (
            <p className="text-gray-500 text-sm p-5">No hay notificaciones.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {notifs.map((n) => {
                const activa = n.fecha_inicio <= hoy && n.fecha_expiracion >= hoy;
                const expirada = n.fecha_expiracion < hoy;
                return (
                  <div key={n.idnotificacion} className="px-4 py-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-medium">{n.titulo}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                            activa ? "bg-green-600/20 text-green-400" :
                            expirada ? "bg-gray-700 text-gray-400" :
                            "bg-blue-600/20 text-blue-400"
                          }`}>
                            {activa ? "Activa" : expirada ? "Expirada" : "Programada"}
                          </span>
                          {n.tipo === "aumento_cuota" && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-600/20 text-orange-400 shrink-0">Aumento</span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mt-1">{n.texto}</p>
                        {n.tipo === "aumento_cuota" && n.precio_nuevo && (
                          <p className="text-orange-400 text-xs mt-0.5">Nuevo precio: ${Number(n.precio_nuevo).toLocaleString("es-AR")}/h</p>
                        )}
                        <p className="text-gray-600 text-xs mt-1">
                          {fmtFecha(n.fecha_inicio)} — {fmtFecha(n.fecha_expiracion)} · {n.para_todos ? "Todos los clientes" : `${n.destinatarios} clientes`}
                        </p>
                      </div>
                      <button
                        onClick={() => eliminar(n.idnotificacion)}
                        className="text-red-400 text-sm px-2 py-1 rounded-lg hover:bg-red-900/30 shrink-0 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Modal nueva notificación */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 pb-4 sm:pb-0">
          <div className="bg-gray-900 rounded-2xl p-5 w-full max-w-md max-h-[90dvh] overflow-y-auto space-y-4">
            <h2 className="text-white font-bold text-lg">Nueva notificación</h2>

            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Título</label>
                <input type="text" placeholder="Ej: Aumento de cuota agosto" value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="text-gray-400 text-sm block mb-1">Texto</label>
                <textarea rows={3} placeholder="Mensaje para el cliente..."
                  value={texto} onChange={(e) => setTexto(e.target.value)}
                  className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <div>
                <label className="text-gray-400 text-sm block mb-1">Tipo</label>
                <div className="flex gap-2">
                  {(["general", "aumento_cuota"] as const).map((t) => (
                    <button key={t} onClick={() => setTipo(t)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        tipo === t ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                      }`}>
                      {t === "general" ? "General" : "Aumento de cuota"}
                    </button>
                  ))}
                </div>
              </div>

              {tipo === "aumento_cuota" && (
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Nuevo precio por hora ($)</label>
                  <input type="number" inputMode="numeric" min="1" placeholder="Ej: 6000"
                    value={precioNuevo} onChange={(e) => setPrecioNuevo(e.target.value)}
                    className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Desde</label>
                  <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Hasta</label>
                  <input type="date" value={fechaExp} onChange={(e) => setFechaExp(e.target.value)}
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Destinatarios */}
              <div>
                <label className="text-gray-400 text-sm block mb-2">Destinatarios</label>
                <button
                  onClick={() => setParaTodos(!paraTodos)}
                  className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors mb-2 ${
                    paraTodos ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}>
                  {paraTodos ? "✓ Todos los clientes activos" : "Todos los clientes activos"}
                </button>

                {!paraTodos && (
                  <div className="space-y-1 max-h-40 overflow-y-auto bg-gray-800 rounded-xl p-2">
                    {clientes.map((c) => (
                      <button key={c.idcliente}
                        onClick={() => toggleCliente(c.idcliente)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                          clientesSelec.includes(c.idcliente)
                            ? "bg-blue-600/20 text-blue-300"
                            : "text-gray-400 hover:text-white hover:bg-gray-700"
                        }`}>
                        <span>{c.nombre}</span>
                        <span className="text-xs text-gray-500">{c.dni}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setModalAbierto(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminNav />
    </div>
  );
}
