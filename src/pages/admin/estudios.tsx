import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";

type Estudio = { idestudio: number; nombre: string; activo: number };

export default function AdminEstudios() {
  const router = useRouter();
  const [estudios, setEstudios] = useState<Estudio[]>([]);
  const [nuevaNombre, setNuevaNombre] = useState("");
  const [formAbierto, setFormAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    const res = await fetch("/api/admin/estudios");
    if (res.status === 401) { router.replace("/admin"); return; }
    setEstudios(await res.json());
  }

  async function crearEstudio() {
    if (!nuevaNombre.trim()) return;
    setGuardando(true); setError("");
    const res = await fetch("/api/admin/estudios", {
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
    await fetch(`/api/admin/estudios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: editNombre.trim() }),
    });
    setEditId(null); cargar();
  }

  async function toggleActivo(e: Estudio) {
    await fetch(`/api/admin/estudios/${e.idestudio}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: e.activo === 1 ? 0 : 1 }),
    });
    cargar();
  }

  async function eliminar(id: number) {
    const res = await fetch(`/api/admin/estudios/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error);
    } else {
      cargar();
    }
  }

  return (
    <div className="min-h-[100dvh] bg-gray-950 px-4 py-6 pb-6 sm:pl-64">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Header */}
        <div className="pl-12">
          <h1 className="text-white font-bold text-xl">Estudios</h1>
        </div>

        {/* Botón nuevo estudio */}
        <button
          onClick={() => { setFormAbierto(!formAbierto); setError(""); }}
          className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors"
        >
          {formAbierto ? "Cancelar" : "+ Nuevo estudio"}
        </button>

        {formAbierto && (
          <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
            <input
              type="text"
              placeholder="Nombre del estudio (ej: Estudio A, Estudio 1)"
              value={nuevaNombre}
              onChange={(e) => setNuevaNombre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && crearEstudio()}
              autoFocus
              className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={crearEstudio}
              disabled={guardando || !nuevaNombre.trim()}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors"
            >
              {guardando ? "Guardando..." : "Crear estudio"}
            </button>
          </div>
        )}

        {/* Lista */}
        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          {estudios.length === 0 ? (
            <p className="text-gray-500 text-sm p-5">No hay estudios creados.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {estudios.map((e) => (
                <div key={e.idestudio} className="px-4 py-3.5 space-y-2">
                  {editId === e.idestudio ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editNombre}
                        onChange={(ev) => setEditNombre(ev.target.value)}
                        onKeyDown={(ev) => { if (ev.key === "Enter") renombrar(e.idestudio); if (ev.key === "Escape") setEditId(null); }}
                        autoFocus
                        className="flex-1 bg-gray-800 text-white border border-blue-500 rounded-xl px-3 py-2 text-sm focus:outline-none"
                      />
                      <button onClick={() => renombrar(e.idestudio)} className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-2 rounded-xl">
                        Guardar
                      </button>
                      <button onClick={() => setEditId(null)} className="text-gray-500 text-sm px-2 py-2">
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${e.activo ? "bg-green-400" : "bg-gray-600"}`} />
                        <span className={`font-medium ${e.activo ? "text-white" : "text-gray-500"}`}>{e.nombre}</span>
                        {!e.activo && <span className="text-xs text-gray-600">Inactivo</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditId(e.idestudio); setEditNombre(e.nombre); }}
                          className="text-gray-400 hover:text-white text-sm px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          Renombrar
                        </button>
                        <button
                          onClick={() => toggleActivo(e)}
                          className={`text-sm px-2 py-1 rounded-lg transition-colors ${
                            e.activo
                              ? "text-yellow-400 hover:text-yellow-300 hover:bg-gray-800"
                              : "text-green-400 hover:text-green-300 hover:bg-gray-800"
                          }`}
                        >
                          {e.activo ? "Desactivar" : "Activar"}
                        </button>
                        <button
                          onClick={() => { setError(""); eliminar(e.idestudio); }}
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
          Solo se pueden eliminar estudios sin horarios asignados. Para deshabilitarlos del calendario usá "Desactivar".
        </p>

      </div>
      <AdminNav />
    </div>
  );
}
