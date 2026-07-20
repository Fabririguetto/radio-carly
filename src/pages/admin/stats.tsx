import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

type Stats = {
  cobrado: { hoy: number; semana: number; mes: number };
  sesiones: { total: number; asistieron: number; no_asistieron: number };
  deudores: { nombre: string; dni: string; balance: number }[];
};

function fmt(n: number) {
  return `$${Number(n).toLocaleString("es-AR")}`;
}

function mesActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mesLabel(mes: string) {
  const [y, m] = mes.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

export default function AdminStats() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [mes, setMes] = useState(mesActual());
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    async function cargar() {
      const res = await fetch("/api/admin/stats");
      if (res.status === 401) { router.replace("/admin"); return; }
      setStats(await res.json());
    }
    cargar();
  }, []);

  async function exportarCSV() {
    setExportando(true);
    const res = await fetch(`/api/admin/export?mes=${mes}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pagos-${mes}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportando(false);
  }

  return (
    <div className="min-h-[100dvh] bg-gray-950 px-4 py-6 pb-10">
      <div className="max-w-lg mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/admin/clientes" className="text-gray-400 text-sm py-2 pr-2">← Volver</Link>
          <h1 className="text-white font-bold text-xl">Caja</h1>
        </div>

        {/* Cobrado */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Hoy",    value: stats?.cobrado.hoy },
            { label: "Semana", value: stats?.cobrado.semana },
            { label: "Mes",    value: stats?.cobrado.mes },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-900 rounded-2xl p-4 text-center">
              <p className="text-gray-500 text-xs">{label}</p>
              <p className="text-green-400 font-bold text-lg mt-1">
                {value !== undefined ? fmt(value) : "—"}
              </p>
            </div>
          ))}
        </div>

        {/* Sesiones de hoy */}
        {stats && (
          <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
            <h2 className="text-white font-semibold">Sesiones hoy</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-gray-500 text-xs">Total</p>
                <p className="text-white font-bold text-2xl mt-0.5">{stats.sesiones.total}</p>
              </div>
              <div className="text-center border-x border-gray-800">
                <p className="text-gray-500 text-xs">Asistieron</p>
                <p className="text-green-400 font-bold text-2xl mt-0.5">{stats.sesiones.asistieron}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-xs">Ausentes</p>
                <p className="text-red-400 font-bold text-2xl mt-0.5">{stats.sesiones.no_asistieron}</p>
              </div>
            </div>
          </div>
        )}

        {/* Top deudores */}
        {stats && stats.deudores.length > 0 && (
          <div className="bg-gray-900 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <h2 className="text-white font-semibold">Deudas pendientes</h2>
            </div>
            <div className="divide-y divide-gray-800">
              {stats.deudores.map((d) => (
                <div key={d.dni} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-white text-sm font-medium">{d.nombre}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{d.dni}</p>
                  </div>
                  <span className="text-yellow-400 font-bold text-sm">{fmt(d.balance)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exportar CSV */}
        <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
          <h2 className="text-white font-semibold">Exportar pagos</h2>
          <div className="space-y-1.5">
            <label className="text-gray-400 text-sm">Mes</label>
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={exportarCSV}
            disabled={exportando}
            className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors"
          >
            {exportando ? "Descargando..." : `Descargar CSV — ${mesLabel(mes)}`}
          </button>
          <p className="text-gray-600 text-xs text-center">Incluye solo pagos aprobados. Compatible con Excel.</p>
        </div>

      </div>
    </div>
  );
}
