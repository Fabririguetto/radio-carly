import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AdminNav from "@/components/AdminNav";
import SearchableSelect from "@/components/SearchableSelect";

const DIAS       = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_LARGO = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const HORA_INICIO = 0;
const HORA_FIN    = 24;
const PX_HR       = 56;
const TOTAL_HRS   = HORA_FIN - HORA_INICIO;
const HEADER_H    = 44;
const TIME_W      = 44;
const MIN_SLOT    = 15;

const COLORES = [
  "bg-blue-600/85 border-blue-400 text-white",
  "bg-purple-600/85 border-purple-400 text-white",
  "bg-emerald-600/85 border-emerald-400 text-white",
  "bg-amber-600/85 border-amber-400 text-white",
  "bg-pink-600/85 border-pink-400 text-white",
  "bg-orange-600/85 border-orange-400 text-white",
  "bg-teal-600/85 border-teal-400 text-white",
];

type ProgHorario = { idprograma_horario: number; idestudio: number; estudio_nombre: string; dia_semana: number; hora_inicio: string; hora_fin: string };
type Programa    = { idprograma: number; idcliente: number; cliente_nombre: string; nombre: string; fecha_inicio: string; fecha_fin: string | null; activo: number; horarios: ProgHorario[] };
type Cliente     = { idcliente: number; nombre: string; dni: string };
type Estudio     = { idestudio: number; nombre: string };

type DragOverlay = { colIdx: number; startMin: number; endMin: number };
type DragState = { colIdx: number; startMin: number; fechaDate: Date; columnTop: number };
type NuevoProg = {
  visible: boolean;
  fecha: Date;
  hora_inicio: string;
  hora_fin: string;
  idcliente: string;
  nombre: string;
  idestudio: string;
  fecha_inicio: string;
  fecha_fin: string;
};

// ── helpers ──────────────────────────────────────────────────────────────────
function toMin(t: string) { const [h, m] = t.slice(0, 5).split(":").map(Number); return h * 60 + m; }
function minToTime(m: number) { return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; }
function yToMin(y: number) {
  const raw = HORA_INICIO * 60 + (y / PX_HR) * 60;
  return Math.max(0, Math.min(HORA_FIN * 60, Math.round(raw / MIN_SLOT) * MIN_SLOT));
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

// ── TimeAxis ──────────────────────────────────────────────────────────────────
function TimeAxis({ everyN = 1 }: { everyN?: number }) {
  return (
    <div className="relative flex-shrink-0 overflow-hidden" style={{ width: TIME_W, height: TOTAL_HRS * PX_HR }}>
      {Array.from({ length: TOTAL_HRS }).map((_, i) => {
        if (i % everyN !== 0) return null;
        return (
          <span key={i} className="absolute right-1.5 text-[10px] text-gray-500 leading-none select-none"
            style={{ top: i * PX_HR }}>
            {String(i).padStart(2, "0")}:00
          </span>
        );
      })}
    </div>
  );
}

// ── ProgramaColumn ────────────────────────────────────────────────────────────
type Slot = { idprograma: number; nombre: string; cliente_nombre: string; idcliente: number; estudio_nombre: string; hora_inicio: string; hora_fin: string; ci: number };

function ProgramaColumn({
  slots, isToday, nowY, colIdx, dragOverlay, onMouseDown,
}: {
  slots: Slot[];
  isToday: boolean;
  nowY: number;
  colIdx: number;
  dragOverlay: DragOverlay | null;
  onMouseDown: (e: React.MouseEvent, idx: number) => void;
}) {
  const showDrag = dragOverlay?.colIdx === colIdx;
  const dragTop  = showDrag ? Math.min(dragOverlay!.startMin, dragOverlay!.endMin) / 60 * PX_HR : 0;
  const dragH    = showDrag ? Math.max(MIN_SLOT / 60 * PX_HR, Math.abs(dragOverlay!.endMin - dragOverlay!.startMin) / 60 * PX_HR) : 0;

  return (
    <div
      className="relative cursor-crosshair"
      style={{ height: TOTAL_HRS * PX_HR }}
      onMouseDown={(e) => { if (!(e.target as HTMLElement).closest("a")) onMouseDown(e, colIdx); }}
    >
      {Array.from({ length: TOTAL_HRS }).map((_, i) => i % 2 === 1 ? (
        <div key={i} className="absolute w-full bg-white/[0.018]" style={{ top: i * PX_HR, height: PX_HR }} />
      ) : null)}
      {Array.from({ length: TOTAL_HRS + 1 }).map((_, i) => (
        <div key={i} className="absolute w-full border-t border-gray-800" style={{ top: i * PX_HR }} />
      ))}
      {Array.from({ length: TOTAL_HRS }).map((_, i) => (
        <div key={`m${i}`} className="absolute w-full border-t border-gray-800/20 border-dashed" style={{ top: i * PX_HR + PX_HR / 2 }} />
      ))}
      {isToday && nowY >= 0 && nowY <= TOTAL_HRS * PX_HR && (
        <div className="absolute w-full flex items-center pointer-events-none z-30" style={{ top: nowY - 1 }}>
          <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 -ml-1" />
          <div className="flex-1 h-0.5 bg-red-500" />
        </div>
      )}
      {slots.map((s, idx) => {
        const top    = (toMin(s.hora_inicio) - HORA_INICIO * 60) / 60 * PX_HR;
        const height = (toMin(s.hora_fin) - toMin(s.hora_inicio)) / 60 * PX_HR;
        return (
          <Link key={`${s.idprograma}-${idx}`} href={`/admin/clientes/${s.idcliente}`}
            className={`absolute left-0.5 right-0.5 rounded-md border px-1.5 py-0.5 overflow-hidden ${COLORES[s.ci % COLORES.length]}`}
            style={{ top: top + 1, height: height - 2, zIndex: 5 }}>
            <p className="text-[11px] font-bold truncate leading-tight">{s.nombre}</p>
            {height > 26 && <p className="text-[10px] opacity-80 truncate">{s.cliente_nombre}</p>}
            {height > 44 && <p className="text-[10px] opacity-60">{s.hora_inicio.slice(0, 5)}–{s.hora_fin.slice(0, 5)} · {s.estudio_nombre}</p>}
          </Link>
        );
      })}
      {/* Drag selection overlay */}
      {showDrag && (
        <div
          className="absolute left-0.5 right-0.5 bg-blue-500/25 border border-blue-400 rounded pointer-events-none"
          style={{ top: dragTop, height: dragH, zIndex: 25 }}
        />
      )}
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function AdminHorarios() {
  const router = useRouter();
  const [programas, setProgramas]       = useState<Programa[]>([]);
  const [clientes, setClientes]         = useState<Cliente[]>([]);
  const [estudios, setEstudios]         = useState<Estudio[]>([]);
  const [cargando, setCargando]         = useState(true);
  const [semanaStart, setSemanaStart]   = useState<Date>(getMonday(new Date()));
  const [diaActivoMobile, setDiaActivoMobile] = useState(0);
  const [nowY, setNowY]                 = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Drag state
  const dragRef     = useRef<DragState | null>(null);
  const curEndRef   = useRef<number>(0);
  const [dragOverlay, setDragOverlay] = useState<DragOverlay | null>(null);

  // New program modal
  const [nuevoProg, setNuevoProg] = useState<NuevoProg | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState("");

  useEffect(() => {
    const d = new Date().getDay();
    setDiaActivoMobile(d === 0 ? 6 : d - 1);
    function upd() { const n = new Date(); setNowY((n.getHours() * 60 + n.getMinutes()) / 60 * PX_HR); }
    upd();
    const t = setInterval(upd, 60_000);
    cargar();
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!cargando && scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, nowY - 80);
    }
  }, [cargando]); // eslint-disable-line react-hooks/exhaustive-deps

  // Global mousemove + mouseup para el drag
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const { startMin, columnTop } = dragRef.current;
      const y = e.clientY - columnTop;
      const endMin = Math.max(startMin + MIN_SLOT, Math.min(HORA_FIN * 60, yToMin(y)));
      curEndRef.current = endMin;
      setDragOverlay(prev => prev ? { ...prev, endMin } : null);
    }
    function onUp() {
      if (!dragRef.current) return;
      const { startMin, fechaDate } = dragRef.current;
      const endMin = curEndRef.current;
      dragRef.current = null;
      setDragOverlay(null);
      if (endMin - startMin >= MIN_SLOT) {
        setNuevoProg({
          visible: true,
          fecha: fechaDate,
          hora_inicio: minToTime(startMin),
          hora_fin: minToTime(endMin),
          idcliente: "",
          nombre: "",
          idestudio: "",
          fecha_inicio: isoDate(fechaDate),
          fecha_fin: "",
        });
        setErrorModal("");
      }
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function cargar() {
    setCargando(true);
    const [resP, resC, resE] = await Promise.all([
      fetch("/api/admin/programas"),
      fetch("/api/admin/clientes?estado=activo"),
      fetch("/api/admin/estudios"),
    ]);
    if (resP.status === 401) { router.replace("/admin"); return; }
    const pData = await resP.json();
    setProgramas(Array.isArray(pData) ? pData : []);
    setClientes(await resC.json());
    setEstudios(await resE.json());
    setCargando(false);
  }

  // Drag handlers
  function handleMouseDown(e: React.MouseEvent, colIdx: number) {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const columnTop = rect.top;
    const startMin = yToMin(e.clientY - columnTop);
    const initEnd  = Math.min(HORA_FIN * 60, startMin + MIN_SLOT);
    dragRef.current   = { colIdx, startMin, fechaDate: semanaFechas[colIdx], columnTop };
    curEndRef.current = initEnd;
    setDragOverlay({ colIdx, startMin, endMin: initEnd });
  }

  async function crearDesdeCalendario() {
    if (!nuevoProg) return;
    if (!nuevoProg.idcliente || !nuevoProg.nombre.trim() || !nuevoProg.idestudio) {
      setErrorModal("Cliente, nombre y estudio son obligatorios."); return;
    }
    setGuardando(true); setErrorModal("");
    const diaSemana = nuevoProg.fecha.getDay();
    const res = await fetch("/api/admin/programas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idcliente: Number(nuevoProg.idcliente),
        nombre: nuevoProg.nombre.trim(),
        fecha_inicio: nuevoProg.fecha_inicio,
        fecha_fin: nuevoProg.fecha_fin || null,
        horarios: [{
          idestudio: Number(nuevoProg.idestudio),
          dia_semana: diaSemana,
          hora_inicio: nuevoProg.hora_inicio,
          hora_fin: nuevoProg.hora_fin,
        }],
      }),
    });
    if (res.ok) {
      setNuevoProg(null);
      cargar();
    } else {
      const d = await res.json();
      setErrorModal(d.error || "Error al crear el programa.");
    }
    setGuardando(false);
  }

  const semanaFechas = Array.from({ length: 7 }, (_, i) => addDays(semanaStart, i));
  const todayStr     = new Date().toISOString().slice(0, 10);

  const colorIdxProg: Record<number, number> = {};
  programas.forEach((p, i) => { colorIdxProg[p.idprograma] = i % COLORES.length; });

  function slotsParaDia(fechaDate: Date): Slot[] {
    const dateStr  = isoDate(fechaDate);
    const diaSemana = fechaDate.getDay();
    const result: Slot[] = [];
    programas.forEach(p => {
      if (!p.activo) return;
      if (p.fecha_inicio > dateStr) return;
      if (p.fecha_fin && p.fecha_fin < dateStr) return;
      p.horarios.filter(h => h.dia_semana === diaSemana).forEach(h => {
        result.push({
          idprograma: p.idprograma,
          nombre: p.nombre,
          cliente_nombre: p.cliente_nombre,
          idcliente: p.idcliente,
          estudio_nombre: h.estudio_nombre,
          hora_inicio: h.hora_inicio,
          hora_fin: h.hora_fin,
          ci: colorIdxProg[p.idprograma] ?? 0,
        });
      });
    });
    result.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
    return result;
  }

  function fmtSemana() {
    const opt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    return `${semanaFechas[0].toLocaleDateString("es-AR", opt)} – ${semanaFechas[6].toLocaleDateString("es-AR", { ...opt, year: "numeric" })}`;
  }

  return (
    <div className="h-[100dvh] bg-gray-950 flex flex-col overflow-hidden sm:pl-64">

      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between border-b border-gray-800 bg-gray-950 z-40">
        <h1 className="text-white font-bold text-lg pl-10 sm:pl-0">Calendario</h1>
        <span />
      </div>

      {/* Nav semana */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-800 gap-2">
        <button onClick={() => setSemanaStart(d => addDays(d, -7))}
          className="text-gray-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center shrink-0">‹</button>
        <div className="flex-1 flex flex-col items-center min-w-0">
          <p className="text-white text-sm font-medium truncate">{fmtSemana()}</p>
          {semanaFechas.some(f => isoDate(f) === todayStr) && <p className="text-blue-400 text-xs">Esta semana</p>}
        </div>
        <input
          type="date"
          onChange={(e) => { if (e.target.value) setSemanaStart(getMonday(new Date(e.target.value + "T12:00:00"))); }}
          title="Ir a fecha"
          className="shrink-0 bg-gray-800 text-white border border-gray-700 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        />
        {!semanaFechas.some(f => isoDate(f) === todayStr) && (
          <button onClick={() => setSemanaStart(getMonday(new Date()))}
            className="shrink-0 text-xs text-blue-400 hover:text-blue-300 px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
            Hoy
          </button>
        )}
        <button onClick={() => setSemanaStart(d => addDays(d, 7))}
          className="text-gray-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center">›</button>
      </div>

      {cargando ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500 text-sm">Cargando...</p>
        </div>
      ) : (
        <>
          {/* ── Mobile: un día a la vez ── */}
          <div className="flex flex-col sm:hidden flex-1 min-h-0">
            <div className="flex-shrink-0 flex items-center justify-between px-2 py-1.5 border-b border-gray-800">
              <button onClick={() => setDiaActivoMobile(d => (d + 6) % 7)}
                className="text-gray-400 text-3xl w-12 h-10 flex items-center justify-center">‹</button>
              <div className="text-center">
                <span className={`font-semibold text-base ${isoDate(semanaFechas[diaActivoMobile]) === todayStr ? "text-blue-400" : "text-white"}`}>
                  {DIAS_LARGO[semanaFechas[diaActivoMobile].getDay()]}
                </span>
                <p className="text-gray-500 text-xs">
                  {semanaFechas[diaActivoMobile].toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                </p>
              </div>
              <button onClick={() => setDiaActivoMobile(d => (d + 1) % 7)}
                className="text-gray-400 text-3xl w-12 h-10 flex items-center justify-center">›</button>
            </div>
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <div className="flex">
                <TimeAxis everyN={2} />
                <div className="flex-1 border-l border-gray-800 min-w-0">
                  <ProgramaColumn
                    slots={slotsParaDia(semanaFechas[diaActivoMobile])}
                    isToday={isoDate(semanaFechas[diaActivoMobile]) === todayStr}
                    nowY={nowY}
                    colIdx={diaActivoMobile}
                    dragOverlay={dragOverlay}
                    onMouseDown={handleMouseDown}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Desktop: semana completa ── */}
          <div className="hidden sm:flex flex-col flex-1 min-h-0">
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
              <div className="flex flex-col" style={{ minWidth: 560 }}>
                {/* Encabezado sticky */}
                <div className="sticky top-0 z-40 flex flex-shrink-0 border-b border-gray-800 bg-gray-950"
                  style={{ paddingLeft: TIME_W }}>
                  {semanaFechas.map((fecha, i) => {
                    const esHoy = isoDate(fecha) === todayStr;
                    return (
                      <div key={i}
                        className={`flex-1 flex flex-col items-center justify-center border-l border-gray-800 text-xs font-semibold ${esHoy ? "text-blue-400 bg-blue-950/20" : "text-gray-400"}`}
                        style={{ height: HEADER_H }}>
                        <span className="hidden lg:inline">{DIAS_LARGO[fecha.getDay()]}</span>
                        <span className="lg:hidden">{DIAS[fecha.getDay()]}</span>
                        <span className={`text-[10px] mt-0.5 ${esHoy ? "text-blue-300" : "text-gray-600"}`}>
                          {fecha.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* Grilla */}
                <div className="flex">
                  <TimeAxis />
                  <div className="flex flex-1">
                    {semanaFechas.map((fecha, i) => {
                      const esHoy = isoDate(fecha) === todayStr;
                      return (
                        <div key={i} className={`flex-1 border-l border-gray-800 min-w-0 ${esHoy ? "bg-blue-950/10" : ""}`}>
                          <ProgramaColumn
                            slots={slotsParaDia(fecha)}
                            isToday={esHoy}
                            nowY={nowY}
                            colIdx={i}
                            dragOverlay={dragOverlay}
                            onMouseDown={handleMouseDown}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 px-4 py-1.5 border-t border-gray-800 text-center">
            <p className="text-gray-700 text-xs">Arrastrá un rango para crear · Tocá un bloque para ver el cliente</p>
          </div>
        </>
      )}

      {/* Modal: nuevo programa desde calendario */}
      {nuevoProg?.visible && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 pb-4 sm:pb-0">
          <div className="bg-gray-900 rounded-2xl p-5 w-full max-w-sm space-y-4">
            <div>
              <h2 className="text-white font-bold text-lg">Nuevo programa</h2>
              <p className="text-gray-400 text-sm mt-0.5">
                {DIAS_LARGO[nuevoProg.fecha.getDay()]} · {nuevoProg.hora_inicio}–{nuevoProg.hora_fin}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Cliente</label>
                <SearchableSelect
                  options={clientes.map((c) => ({ value: String(c.idcliente), label: c.nombre, sublabel: c.dni }))}
                  value={nuevoProg.idcliente}
                  onChange={(v) => setNuevoProg((p) => p ? { ...p, idcliente: v } : p)}
                  placeholder="Buscar cliente..."
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm block mb-1">Nombre del programa</label>
                <input
                  type="text"
                  placeholder="Ej: La Mañana de Radio X"
                  value={nuevoProg.nombre}
                  onChange={(e) => setNuevoProg((p) => p ? { ...p, nombre: e.target.value } : p)}
                  autoFocus
                  className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm block mb-1">Estudio</label>
                <SearchableSelect
                  options={estudios.map((e) => ({ value: String(e.idestudio), label: e.nombre }))}
                  value={nuevoProg.idestudio}
                  onChange={(v) => setNuevoProg((p) => p ? { ...p, idestudio: v } : p)}
                  placeholder="Buscar estudio..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Horario inicio</label>
                  <input type="time" value={nuevoProg.hora_inicio}
                    onChange={(e) => setNuevoProg((p) => p ? { ...p, hora_inicio: e.target.value } : p)}
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Horario fin</label>
                  <input type="time" value={nuevoProg.hora_fin}
                    onChange={(e) => setNuevoProg((p) => p ? { ...p, hora_fin: e.target.value } : p)}
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Fecha inicio</label>
                  <input type="date" value={nuevoProg.fecha_inicio}
                    onChange={(e) => setNuevoProg((p) => p ? { ...p, fecha_inicio: e.target.value } : p)}
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Fecha fin (opt.)</label>
                  <input type="date" value={nuevoProg.fecha_fin}
                    onChange={(e) => setNuevoProg((p) => p ? { ...p, fecha_fin: e.target.value } : p)}
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {errorModal && <p className="text-red-400 text-sm">{errorModal}</p>}

            <div className="flex gap-3">
              <button onClick={() => setNuevoProg(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={crearDesdeCalendario} disabled={guardando}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
                {guardando ? "Creando..." : "Crear programa"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminNav />
    </div>
  );
}
