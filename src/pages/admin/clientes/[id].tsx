import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";

const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function fmtFecha(d: string | null | undefined): string {
  if (!d) return "—";
  const iso = d.length === 10 ? d + "T12:00:00" : d.replace(" ", "T");
  const date = new Date(iso);
  return isNaN(date.getTime()) ? "—" : date.toLocaleDateString("es-AR");
}

type Horario = { idhorario: number; dia_semana: number; hora_inicio: string; hora_fin: string; estudio_nombre?: string | null };
type Sesion = { idsesion: number; fecha: string; asistio: number; monto: number; hora_inicio: string; hora_fin: string };
type Pago = { idpago: number; monto: number; estado: string; fecha: string };
type Cliente = { idcliente: number; nombre: string; dni: string; ingreso: number; egreso: number; balance: number; activo: number };
type PrecioHistorial = { idhistorial: number; precio_hora: number; precio_reserva: number; fecha_desde: string; fecha_hasta: string | null };

type Tab = "resumen" | "sesiones" | "pagos" | "precios";

export default function ClienteDetalle() {
  const router = useRouter();
  const { id } = router.query as { id: string };

  const [tab, setTab] = useState<Tab>("resumen");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [toggling, setToggling] = useState(false);
  const [preciosHistorial, setPreciosHistorial] = useState<PrecioHistorial[]>([]);
  const [precioGlobal, setPrecioGlobal] = useState<{ precio_hora: number; precio_reserva: number } | null>(null);
  const [modalPrecio, setModalPrecio] = useState(false);
  const [nuevoPrecioHora, setNuevoPrecioHora] = useState("");
  const [nuevoPrecioReserva, setNuevoPrecioReserva] = useState("");
  const [porcentajeHelper, setPorcentajeHelper] = useState("");
  const [nuevaFechaDesde, setNuevaFechaDesde] = useState(new Date().toISOString().slice(0, 10));
  const [guardandoPrecio, setGuardandoPrecio] = useState(false);
  const [errorPrecio, setErrorPrecio] = useState("");
  const [modalBonif, setModalBonif] = useState(false);
  const [montoBonif, setMontoBonif] = useState("");
  const [motivoBonif, setMotivoBonif] = useState("");
  const [guardandoBonif, setGuardandoBonif] = useState(false);
  const [errorBonif, setErrorBonif] = useState("");

  useEffect(() => {
    if (!id) return;
    cargar();
  }, [id]);

  async function cargar() {
    const [resDetalle, resHorarios, resPrecios] = await Promise.all([
      fetch(`/api/admin/clientes/${id}`),
      fetch(`/api/admin/clientes/${id}/horarios`),
      fetch(`/api/admin/clientes/${id}/precios`),
    ]);
    if (resDetalle.status === 401) { router.replace("/admin"); return; }
    const detalle = await resDetalle.json();
    setCliente(detalle.cliente);
    setSesiones(detalle.sesiones);
    setPagos(detalle.pagos);
    setHorarios(await resHorarios.json());
    const preciosData = await resPrecios.json();
    setPreciosHistorial(preciosData.historial ?? []);
    setPrecioGlobal(preciosData.global ?? null);
  }

  async function guardarPrecio() {
    if (!nuevoPrecioHora || !nuevoPrecioReserva || !nuevaFechaDesde) {
      setErrorPrecio("Completá todos los campos.");
      return;
    }
    setGuardandoPrecio(true);
    setErrorPrecio("");
    const res = await fetch(`/api/admin/clientes/${id}/precios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        precio_hora: Number(nuevoPrecioHora),
        precio_reserva: Number(nuevoPrecioReserva),
        fecha_desde: nuevaFechaDesde,
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      setErrorPrecio(d.error || "Error al guardar.");
    } else {
      setModalPrecio(false);
      setNuevoPrecioHora(""); setNuevoPrecioReserva(""); setPorcentajeHelper("");
      cargar();
    }
    setGuardandoPrecio(false);
  }

  async function guardarBonificacion() {
    if (!montoBonif || Number(montoBonif) <= 0) { setErrorBonif("Ingresá un monto válido."); return; }
    if (!motivoBonif.trim()) { setErrorBonif("El motivo es requerido."); return; }
    setGuardandoBonif(true); setErrorBonif("");
    const res = await fetch(`/api/admin/clientes/${id}/bonificacion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monto: Number(montoBonif), motivo: motivoBonif.trim() }),
    });
    if (!res.ok) {
      const d = await res.json();
      setErrorBonif(d.error || "Error al guardar.");
    } else {
      setModalBonif(false);
      setMontoBonif(""); setMotivoBonif("");
      cargar();
    }
    setGuardandoBonif(false);
  }

  async function eliminarPrecio(idhistorial: number) {
    const res = await fetch(`/api/admin/clientes/${id}/precios`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idhistorial }),
    });
    if (res.ok) cargar();
  }

  async function toggleActivo() {
    if (!cliente) return;
    setToggling(true);
    await fetch(`/api/admin/clientes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: cliente.activo === 1 ? 0 : 1 }),
    });
    await cargar();
    setToggling(false);
  }

  async function eliminarHorario(idhorario: number) {
    await fetch(`/api/admin/horarios/${idhorario}`, { method: "DELETE" });
    cargar();
  }

  if (!cliente) return (
    <div className="min-h-[100dvh] bg-gray-950 flex items-center justify-center sm:pl-64">
      <p className="text-gray-500 text-sm">Cargando...</p>
    </div>
  );

  const hoy = new Date().toISOString().slice(0, 10);
  const precioVigente = preciosHistorial.find(
    (p) => p.fecha_desde <= hoy && (p.fecha_hasta === null || p.fecha_hasta >= hoy)
  );
  const precioFuturo = preciosHistorial.find((p) => p.fecha_desde > hoy && p.fecha_hasta === null);
  const fuente = precioVigente ? "individual" : "global";
  const phMostrar = precioVigente?.precio_hora ?? precioGlobal?.precio_hora;
  const prMostrar = precioVigente?.precio_reserva ?? precioGlobal?.precio_reserva;

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "resumen",  label: "Resumen" },
    { key: "sesiones", label: "Sesiones", count: sesiones.length },
    { key: "pagos",    label: "Pagos",    count: pagos.length },
    { key: "precios",  label: "Precios" },
  ];

  return (
    <div className="min-h-[100dvh] bg-gray-950 flex flex-col sm:pl-64">

      {/* Header sticky */}
      <div className="sticky top-0 z-30 bg-gray-950 border-b border-gray-800">
        <div className="flex items-center gap-3 px-4 py-3 pl-16 sm:pl-4">
          <Link href="/admin/clientes" className="text-gray-400 hover:text-white p-1.5 -ml-1.5 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-white font-bold text-base leading-tight truncate">{cliente.nombre}</h1>
              <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                cliente.activo ? "bg-green-600/20 text-green-400" : "bg-gray-600/30 text-gray-400"
              }`}>
                {cliente.activo ? "Activo" : "Inactivo"}
              </span>
            </div>
            <p className="text-gray-500 text-xs">DNI {cliente.dni}</p>
          </div>
        </div>

        {/* Balance rápido */}
        <div className="grid grid-cols-3 border-t border-gray-800/60">
          <div className="text-center py-2.5 border-r border-gray-800/60">
            <p className="text-gray-500 text-[10px] uppercase tracking-wide">Cobrado</p>
            <p className="text-white font-bold text-sm mt-0.5">${Number(cliente.egreso).toLocaleString("es-AR")}</p>
          </div>
          <div className="text-center py-2.5 border-r border-gray-800/60">
            <p className="text-gray-500 text-[10px] uppercase tracking-wide">Pagado</p>
            <p className="text-green-400 font-bold text-sm mt-0.5">${Number(cliente.ingreso).toLocaleString("es-AR")}</p>
          </div>
          <div className="text-center py-2.5">
            <p className="text-gray-500 text-[10px] uppercase tracking-wide">Deuda</p>
            <p className={`font-bold text-sm mt-0.5 ${Number(cliente.balance) > 0 ? "text-yellow-400" : "text-green-400"}`}>
              ${Number(cliente.balance).toLocaleString("es-AR")}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-gray-800/60">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors relative ${
                tab === t.key ? "text-blue-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`ml-1 text-[10px] px-1 rounded-full ${
                  tab === t.key ? "bg-blue-600/30 text-blue-400" : "bg-gray-800 text-gray-500"
                }`}>{t.count}</span>
              )}
              {tab === t.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido por tab */}
      <div className="flex-1 px-4 py-4 pb-8 max-w-2xl w-full mx-auto space-y-3">

        {/* ── RESUMEN ── */}
        {tab === "resumen" && (
          <>
            {/* Horarios fijos */}
            <section className="bg-gray-900 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <h2 className="text-white font-semibold text-sm">Horarios fijos</h2>
                <Link
                  href={`/admin/horarios?cliente=${id}`}
                  className="text-blue-400 text-xs font-medium hover:text-blue-300 transition-colors"
                >
                  + Agregar
                </Link>
              </div>
              {horarios.length === 0 ? (
                <p className="text-gray-500 text-sm px-4 pb-4">Sin horarios asignados.</p>
              ) : (
                <div className="divide-y divide-gray-800">
                  {horarios.map((h) => (
                    <div key={h.idhorario} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <span className="text-white text-sm font-medium">{DIAS[h.dia_semana]}</span>
                        <span className="text-gray-400 text-sm ml-2">{h.hora_inicio.slice(0, 5)} – {h.hora_fin.slice(0, 5)}</span>
                        {h.estudio_nombre && <p className="text-gray-500 text-xs mt-0.5">{h.estudio_nombre}</p>}
                      </div>
                      <button
                        onClick={() => eliminarHorario(h.idhorario)}
                        className="text-red-400 text-sm px-3 py-1.5 rounded-lg active:bg-red-900/30 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Bonificación */}
            <section className="bg-gray-900 rounded-2xl p-4 space-y-3">
              <h2 className="text-white font-semibold text-sm">Bonificaciones</h2>
              <p className="text-gray-500 text-sm">Acreditá saldo a favor del cliente.</p>
              <button
                onClick={() => { setModalBonif(true); setErrorBonif(""); }}
                className="w-full bg-green-700 hover:bg-green-600 active:bg-green-800 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                + Cargar bonificación
              </button>
            </section>

            {/* Estado */}
            <section className="bg-gray-900 rounded-2xl p-4 space-y-3">
              <h2 className="text-white font-semibold text-sm">Estado del cliente</h2>
              <p className="text-gray-500 text-sm">
                {cliente.activo
                  ? "El cliente puede registrar sesiones en el kiosco."
                  : "El cliente está desactivado y no aparece en el kiosco."}
              </p>
              <button
                onClick={toggleActivo}
                disabled={toggling}
                className={`w-full font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm ${
                  cliente.activo
                    ? "bg-red-700 hover:bg-red-600 active:bg-red-800 text-white"
                    : "bg-green-700 hover:bg-green-600 active:bg-green-800 text-white"
                }`}
              >
                {toggling ? "Guardando..." : cliente.activo ? "Desactivar cliente" : "Reactivar cliente"}
              </button>
            </section>
          </>
        )}

        {/* ── SESIONES ── */}
        {tab === "sesiones" && (
          <section className="bg-gray-900 rounded-2xl overflow-hidden">
            {sesiones.length === 0 ? (
              <p className="text-gray-500 text-sm p-4">Sin sesiones registradas.</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {sesiones.map((s) => (
                  <div key={s.idsesion} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-white text-sm font-medium">{fmtFecha(s.fecha)}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {s.hora_inicio?.slice(0, 5)} – {s.hora_fin?.slice(0, 5)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm font-semibold">${Number(s.monto).toLocaleString("es-AR")}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 inline-block ${
                        s.asistio ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"
                      }`}>
                        {s.asistio ? "Asistió" : "Reserva"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── PAGOS ── */}
        {tab === "pagos" && (
          <section className="bg-gray-900 rounded-2xl overflow-hidden">
            {pagos.length === 0 ? (
              <p className="text-gray-500 text-sm p-4">Sin pagos registrados.</p>
            ) : (
              <div className="divide-y divide-gray-800">
                {pagos.map((p) => (
                  <div key={p.idpago} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-white text-sm font-medium">{fmtFecha(p.fecha)}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 inline-block ${
                        p.estado === "aprobado" ? "bg-green-600/20 text-green-400" :
                        p.estado === "rechazado" ? "bg-red-600/20 text-red-400" :
                        "bg-yellow-600/20 text-yellow-400"
                      }`}>
                        {p.estado}
                      </span>
                    </div>
                    <p className="text-white text-sm font-semibold">${Number(p.monto).toLocaleString("es-AR")}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── PRECIOS ── */}
        {tab === "precios" && (
          <>
            <section className="bg-gray-900 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold text-sm">Precio actual</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full ${fuente === "individual" ? "bg-blue-600/20 text-blue-400" : "bg-gray-700 text-gray-400"}`}>
                  {fuente === "individual" ? "Individual" : "Global"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-gray-500 text-xs">Por hora</p>
                  <p className="text-white font-bold text-xl mt-1">${Number(phMostrar ?? 0).toLocaleString("es-AR")}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3">
                  <p className="text-gray-500 text-xs">Reserva</p>
                  <p className="text-white font-bold text-xl mt-1">${Number(prMostrar ?? 0).toLocaleString("es-AR")}</p>
                </div>
              </div>

              {precioFuturo && (
                <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl px-3 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-blue-400 text-xs font-medium">Aumento desde {fmtFecha(precioFuturo.fecha_desde)}</p>
                    <p className="text-white text-sm mt-0.5">
                      ${Number(precioFuturo.precio_hora).toLocaleString("es-AR")} / ${Number(precioFuturo.precio_reserva).toLocaleString("es-AR")}
                    </p>
                  </div>
                  <button
                    onClick={() => eliminarPrecio(precioFuturo.idhistorial)}
                    className="text-red-400 text-xs px-2 py-1 rounded-lg hover:bg-red-900/30 transition-colors shrink-0"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  setNuevoPrecioHora(String(phMostrar ?? ""));
                  setNuevoPrecioReserva(String(prMostrar ?? ""));
                  setPorcentajeHelper("");
                  setNuevaFechaDesde(new Date().toISOString().slice(0, 10));
                  setErrorPrecio("");
                  setModalPrecio(true);
                }}
                className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
              >
                Actualizar precio
              </button>
            </section>

            {preciosHistorial.length > 0 && (
              <section className="bg-gray-900 rounded-2xl overflow-hidden">
                <p className="text-gray-500 text-xs font-medium px-4 pt-3 pb-2 uppercase tracking-wide">Historial</p>
                <div className="divide-y divide-gray-800">
                  {preciosHistorial.map((p) => (
                    <div key={p.idhistorial} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-gray-300 text-sm">${Number(p.precio_hora).toLocaleString("es-AR")} / hora</p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {fmtFecha(p.fecha_desde)} — {p.fecha_hasta ? fmtFecha(p.fecha_hasta) : "vigente"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Modal bonificación */}
      {modalBonif && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 pb-4 sm:pb-0">
          <div className="bg-gray-900 rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h2 className="text-white font-bold text-lg">Cargar bonificación</h2>
            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-sm block mb-1.5">Monto a acreditar ($)</label>
                <input
                  type="number" inputMode="numeric" min="1"
                  placeholder="Ej: 5000"
                  value={montoBonif}
                  onChange={(e) => setMontoBonif(e.target.value)}
                  className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1.5">Motivo</label>
                <input
                  type="text"
                  placeholder="Ej: Corte de luz — sesión no realizada"
                  value={motivoBonif}
                  onChange={(e) => setMotivoBonif(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && guardarBonificacion()}
                  className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            {errorBonif && <p className="text-red-400 text-sm">{errorBonif}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setModalBonif(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarBonificacion}
                disabled={guardandoBonif}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {guardandoBonif ? "Guardando..." : "Acreditar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal actualizar precio */}
      {modalPrecio && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 pb-4 sm:pb-0">
          <div className="bg-gray-900 rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h2 className="text-white font-bold text-lg">Actualizar precio</h2>

            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-sm block mb-1.5">Precio hora ($)</label>
                <input
                  type="number" inputMode="numeric" min="1"
                  value={nuevoPrecioHora}
                  onChange={(e) => {
                    setNuevoPrecioHora(e.target.value);
                    if (porcentajeHelper && Number(e.target.value) > 0) {
                      const pr = Math.round(Number(e.target.value) * Number(porcentajeHelper) / 100);
                      setNuevoPrecioReserva(String(pr));
                    }
                  }}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm block mb-1.5">Precio reserva ($)</label>
                <div className="flex gap-2">
                  <input
                    type="number" inputMode="numeric" min="1"
                    value={nuevoPrecioReserva}
                    onChange={(e) => setNuevoPrecioReserva(e.target.value)}
                    className="flex-1 bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number" min="1" max="100" placeholder="%"
                      value={porcentajeHelper}
                      onChange={(e) => {
                        setPorcentajeHelper(e.target.value);
                        if (e.target.value && Number(nuevoPrecioHora) > 0) {
                          const pr = Math.round(Number(nuevoPrecioHora) * Number(e.target.value) / 100);
                          setNuevoPrecioReserva(String(pr));
                        }
                      }}
                      className="w-16 bg-gray-800 text-white border border-gray-700 rounded-xl px-2 py-3 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <span className="text-gray-500 text-sm">%</span>
                  </div>
                </div>
                <p className="text-gray-600 text-xs mt-1">Ingresá % para calcular automáticamente</p>
              </div>

              <div>
                <label className="text-gray-400 text-sm block mb-1.5">Vigente desde</label>
                <input
                  type="date"
                  value={nuevaFechaDesde}
                  onChange={(e) => setNuevaFechaDesde(e.target.value)}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {errorPrecio && <p className="text-red-400 text-sm">{errorPrecio}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setModalPrecio(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarPrecio}
                disabled={guardandoPrecio}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {guardandoPrecio ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminNav />
    </div>
  );
}
