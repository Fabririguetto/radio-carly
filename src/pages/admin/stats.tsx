import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import AdminNav from "@/components/AdminNav";

type Stats = {
  cobrado: number;
  sesiones: { total: number; asistieron: number; no_asistieron: number };
  deudores: { nombre: string; dni: string; balance: number }[];
};

type Periodo = "hoy" | "semana" | "mes" | "custom";

function fmt(n: number) {
  return `$${Number(n).toLocaleString("es-AR")}`;
}

function fechaHoy() {
  return new Date().toISOString().slice(0, 10);
}

function lunesDeEstaSemana() {
  const d = new Date();
  const dia = d.getDay();
  d.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1));
  return d.toISOString().slice(0, 10);
}

function primeroDelMes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function rangoDePeriodo(p: Periodo, desde: string, hasta: string) {
  const hoy = fechaHoy();
  if (p === "hoy")   return { desde: hoy, hasta: hoy };
  if (p === "semana") return { desde: lunesDeEstaSemana(), hasta: hoy };
  if (p === "mes")    return { desde: primeroDelMes(), hasta: hoy };
  return { desde, hasta };
}

function labelFecha(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function labelPeriodo(desde: string, hasta: string) {
  if (desde === hasta) return labelFecha(desde);
  return `${labelFecha(desde)} – ${labelFecha(hasta)}`;
}

function mesActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mesLabel(mes: string) {
  const [y, m] = mes.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("es-AR", {
    month: "long", year: "numeric",
  });
}

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "hoy",    label: "Hoy" },
  { id: "semana", label: "Semana" },
  { id: "mes",    label: "Mes" },
  { id: "custom", label: "Período" },
];

export default function AdminStats() {
  const router = useRouter();

  const [periodo, setPeriodo] = useState<Periodo>("hoy");
  const [desde, setDesde] = useState(fechaHoy());
  const [hasta, setHasta] = useState(fechaHoy());

  const [stats, setStats] = useState<Stats | null>(null);
  const [cargando, setCargando] = useState(false);

  const [mes, setMes] = useState(mesActual());
  const [exportando, setExportando] = useState(false);

  const cargar = useCallback(async (d: string, h: string) => {
    setCargando(true);
    const res = await fetch(`/api/admin/stats?desde=${d}&hasta=${h}`);
    if (res.status === 401) { router.replace("/admin"); return; }
    setStats(await res.json());
    setCargando(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Carga inicial
  useEffect(() => {
    const { desde: d, hasta: h } = rangoDePeriodo("hoy", desde, hasta);
    cargar(d, h);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function seleccionarPeriodo(p: Periodo) {
    setPeriodo(p);
    if (p !== "custom") {
      const { desde: d, hasta: h } = rangoDePeriodo(p, desde, hasta);
      setDesde(d);
      setHasta(h);
      cargar(d, h);
    }
  }

  function aplicarCustom() {
    if (desde && hasta && desde <= hasta) cargar(desde, hasta);
  }

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

  const rangoActual = rangoDePeriodo(periodo, desde, hasta);

  return (
    <div className="min-h-[100dvh] bg-gray-950 px-4 py-6 pb-6 sm:pl-64">
      <div className="max-w-lg mx-auto space-y-5">

        {/* Header */}
        <h1 className="text-white font-bold text-xl pl-12">Estadísticas</h1>

        {/* Selector de período */}
        <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
          <div className="flex gap-2">
            {PERIODOS.map((p) => (
              <button
                key={p.id}
                onClick={() => seleccionarPeriodo(p.id)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  periodo === p.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {periodo === "custom" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-gray-500 text-xs">Desde</label>
                  <input
                    type="date"
                    value={desde}
                    max={hasta}
                    onChange={(e) => setDesde(e.target.value)}
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-gray-500 text-xs">Hasta</label>
                  <input
                    type="date"
                    value={hasta}
                    min={desde}
                    max={fechaHoy()}
                    onChange={(e) => setHasta(e.target.value)}
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={aplicarCustom}
                disabled={!desde || !hasta || desde > hasta || cargando}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {cargando ? "Cargando..." : "Aplicar"}
              </button>
            </div>
          )}

          {periodo !== "custom" && (
            <p className="text-gray-600 text-xs text-center">
              {labelPeriodo(rangoActual.desde, rangoActual.hasta)}
            </p>
          )}
        </div>

        {/* Cobrado en el período */}
        <div className="bg-gray-900 rounded-2xl p-5 text-center space-y-1">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Cobrado</p>
          <p className={`font-bold text-4xl mt-1 transition-opacity ${cargando ? "opacity-40" : ""}`}>
            {stats ? (
              <span className="text-green-400">{fmt(stats.cobrado)}</span>
            ) : (
              <span className="text-gray-700">—</span>
            )}
          </p>
        </div>

        {/* Sesiones en el período */}
        <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
          <h2 className="text-white font-semibold">Sesiones</h2>
          <div className={`grid grid-cols-3 gap-3 transition-opacity ${cargando ? "opacity-40" : ""}`}>
            <div className="text-center">
              <p className="text-gray-500 text-xs">Total</p>
              <p className="text-white font-bold text-2xl mt-0.5">{stats?.sesiones.total ?? "—"}</p>
            </div>
            <div className="text-center border-x border-gray-800">
              <p className="text-gray-500 text-xs">Asistieron</p>
              <p className="text-green-400 font-bold text-2xl mt-0.5">{stats?.sesiones.asistieron ?? "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-xs">Ausentes</p>
              <p className="text-red-400 font-bold text-2xl mt-0.5">{stats?.sesiones.no_asistieron ?? "—"}</p>
            </div>
          </div>
        </div>

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
          <p className="text-gray-600 text-xs text-center">Solo pagos aprobados. Compatible con Excel.</p>
        </div>

      </div>
      <AdminNav />
    </div>
  );
}
