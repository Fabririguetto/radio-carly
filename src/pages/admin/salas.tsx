import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

type Sala = { idsala: number; nombre: string; activo: number };

export default function AdminSalas() {
  const router = useRouter();
  const [salas, setSalas] = useState<Sala[]>([]);
  const [nuevaNombre, setNuevaNombre] = useState("");
  const [formAbierto, setFormAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const res = await fetch("/api/admin/salas");
    if (res.status === 401) { router.replace("/admin"); return; }
    setSalas(await res.json());
  }

  async function crearSala() {
    if (!nuevaNombre.trim()) return;
    setGuardando(true); setError("");
    const res = await fetch("/api/admin/salas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevaNombre.trim() }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error);
    } else {
      setNuevaNombre(""); setFormAbierto(false);
      cargar();
    }
    setGuardando(false);
  }

  async function renombrar(id: number) {
    if (!editNombre.trim()) return;
    await fetch(`/api/admin/salas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: editNombre.trim() }),
    });
    setEditId(null); cargar();
  }

  async function toggleActivo(s: Sala) {
    await fetch(`/api/admin/salas/${s.idsala}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: s.activo === 1 ? 0 : 1 }),
    });
    cargar();
  }

  async function eliminar(id: number) {
    const res = await fetch(`/api/admin/salas/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error);
    } else {
      cargar();
    }
  }

  return (
    <div className="min-h-[100dvh] bg-gray-950 px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/horarios" className="text-gray-400 text-sm py-2 pr-1">←</Link>
            <h1 className="text-white font-bold text-xl">Salas</h1>
          </div>
          <button
            onClick={async () => { await fetch("/api/admin/auth", { method: "DELETE" }); router.push("/"); }}
            title="Salir"
            className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
            </svg>
          </button>
        </div>

        {/* Botón nueva sala */}
        <button
          onClick={() => { setFormAbierto(!formAbierto); setError(""); }}
          className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors"
        >
          {formAbierto ? "Cancelar" : "+ Nueva sala"}
        </button>

        {formAbierto && (
          <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
            <input
              type="text"
              placeholder="Nombre de la sala (ej: Sala A, Estudio 1)"
              value={nuevaNombre}
              onChange={(e) => setNuevaNombre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && crearSala()}
              autoFocus
              className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={crearSala}
              disabled={guardando || !nuevaNombre.trim()}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors"
            >
              {guardando ? "Guardando..." : "Crear sala"}
            </button>
          </div>
        )}

        {/* Lista */}
        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          {salas.length === 0 ? (
            <p className="text-gray-500 text-sm p-5">No hay salas creadas.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {salas.map((s) => (
                <div key={s.idsala} className="px-4 py-3.5 space-y-2">
                  {editId === s.idsala ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") renombrar(s.idsala); if (e.key === "Escape") setEditId(null); }}
                        autoFocus
                        className="flex-1 bg-gray-800 text-white border border-blue-500 rounded-xl px-3 py-2 text-sm focus:outline-none"
                      />
                      <button onClick={() => renombrar(s.idsala)} className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-2 rounded-xl">
                        Guardar
                      </button>
                      <button onClick={() => setEditId(null)} className="text-gray-500 text-sm px-2 py-2">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.activo ? "bg-green-400" : "bg-gray-600"}`} />
                        <span className={`font-medium ${s.activo ? "text-white" : "text-gray-500"}`}>{s.nombre}</span>
                        {!s.activo && <span className="text-xs text-gray-600">Inactiva</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditId(s.idsala); setEditNombre(s.nombre); }}
                          className="text-gray-400 hover:text-white text-sm px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          Renombrar
                        </button>
                        <button
                          onClick={() => toggleActivo(s)}
                          className={`text-sm px-2 py-1 rounded-lg transition-colors ${
                            s.activo
                              ? "text-yellow-400 hover:text-yellow-300 hover:bg-gray-800"
                              : "text-green-400 hover:text-green-300 hover:bg-gray-800"
                          }`}
                        >
                          {s.activo ? "Desactivar" : "Activar"}
                        </button>
                        <button
                          onClick={() => { setError(""); eliminar(s.idsala); }}
                          className="text-red-500 hover:text-red-400 text-sm px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {error && !formAbierto && (
          <p className="text-red-400 text-sm px-1">{error}</p>
        )}

        <p className="text-gray-600 text-xs px-1">
          Solo se pueden eliminar salas sin horarios asignados. Para deshabilitarlas del calendario usá "Desactivar".
        </p>

      </div>
    </div>
  );
}
