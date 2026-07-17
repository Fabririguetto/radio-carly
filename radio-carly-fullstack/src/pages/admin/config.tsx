import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function AdminConfig() {
  const router = useRouter();
  const [precioHora, setPrecioHora] = useState("");
  const [precioReserva, setPrecioReserva] = useState("");
  const [exito, setExito] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("admin") !== "1") { router.replace("/"); return; }
    fetch("/api/admin/config").then((r) => r.json()).then((d) => {
      setPrecioHora(String(d.precio_hora));
      setPrecioReserva(String(d.precio_reserva));
    });
  }, []);

  async function guardar() {
    setError(""); setExito("");
    if (!precioHora || !precioReserva || Number(precioHora) <= 0 || Number(precioReserva) <= 0) {
      setError("Ingresá precios válidos.");
      return;
    }
    const res = await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ precio_hora: Number(precioHora), precio_reserva: Number(precioReserva) }),
    });
    if (res.ok) setExito("Precios actualizados correctamente.");
    else setError("Error al guardar.");
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="max-w-sm mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/clientes" className="text-gray-400 hover:text-white transition-colors">← Volver</Link>
          <h1 className="text-white font-bold text-2xl">Configuración de precios</h1>
        </div>

        <div className="bg-gray-900 rounded-2xl p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-gray-400 text-sm">Precio por hora ($)</label>
            <input
              type="number"
              min="1"
              value={precioHora}
              onChange={(e) => setPrecioHora(e.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-gray-400 text-sm">Precio reserva (no asistencia) ($)</label>
            <input
              type="number"
              min="1"
              value={precioReserva}
              onChange={(e) => setPrecioReserva(e.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {exito && <p className="text-green-400 text-sm">{exito}</p>}
          <button
            onClick={guardar}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
