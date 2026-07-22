import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import AdminNav from "@/components/AdminNav";
import SearchableSelect from "@/components/SearchableSelect";

type Pago = {
  idpago: number;
  monto: number;
  fecha: string;
  tipo: 'qr' | 'manual' | 'bonificacion' | 'cargo';
  motivo: string | null;
  nombre: string;
  dni: string;
};

const TIPO_BADGE: Record<string, { label: string; cls: string }> = {
  qr:           { label: "QR",      cls: "bg-blue-900/60 text-blue-300" },
  manual:       { label: "Efectivo",cls: "bg-gray-700 text-gray-300" },
  bonificacion: { label: "Bonif.",  cls: "bg-yellow-900/60 text-yellow-300" },
  cargo:        { label: "Cargo",   cls: "bg-red-900/60 text-red-300" },
};

type Cliente = { idcliente: number; nombre: string; dni: string };

function fmt(n: number) {
  return `$${Number(n).toLocaleString("es-AR")}`;
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function fmtFecha(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function AdminCaja() {
  const router = useRouter();
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [total, setTotal] = useState(0);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [cargando, setCargando] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const cargar = useCallback(async (f: string) => {
    setCargando(true);
    const res = await fetch(`/api/admin/caja?fecha=${f}`);
    if (res.status === 401) { router.replace("/admin"); return; }
    const data = await res.json();
    setPagos(data.pagos);
    setTotal(data.total);
    setCargando(false);
  }, [router]);

  useEffect(() => { cargar(fecha); }, [fecha, cargar]);

  async function abrirModal() {
    setError(""); setExito("");
    setClienteId(""); setMonto(""); setMotivo("");
    if (clientes.length === 0) {
      const res = await fetch("/api/admin/clientes?estado=activo");
      setClientes(await res.json());
    }
    setModalAbierto(true);
  }

  async function registrarPago() {
    if (!clienteId || !monto || Number(monto) <= 0) {
      setError("Seleccioná un cliente e ingresá un monto válido.");
      return;
    }
    setGuardando(true);
    setError("");
    const res = await fetch("/api/admin/caja", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idcliente: Number(clienteId), monto: Number(monto), motivo }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Error al registrar el pago.");
    } else {
      setExito("Pago registrado correctamente.");
      setModalAbierto(false);
      cargar(fecha);
    }
    setGuardando(false);
  }

  return (
    <div className="min-h-[100dvh] bg-gray-950 px-4 py-6 pb-6 sm:pl-64">
      <div className="max-w-2xl mx-auto space-y-4">

        <div className="flex items-center justify-between pl-12">
          <h1 className="text-white font-bold text-xl">Caja</h1>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="bg-gray-900 text-white border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Total del día */}
        <div className="bg-gray-900 rounded-2xl p-5">
          <p className="text-gray-400 text-xs uppercase tracking-wide">Total recaudado</p>
          <p className="text-green-400 font-bold text-3xl mt-1">{fmt(total)}</p>
          <p className="text-gray-500 text-xs mt-1">
            {fmtFecha(fecha)} · {pagos.length} {pagos.length === 1 ? "pago" : "pagos"}
            {pagos.some((p) => p.tipo === 'bonificacion') && " · excluye bonificaciones"}
          </p>
        </div>

        {/* Botón registrar pago manual */}
        <button
          onClick={abrirModal}
          className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors"
        >
          + Registrar pago manual
        </button>

        {exito && <p className="text-green-400 text-sm">{exito}</p>}

        {/* Lista de pagos */}
        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          {cargando ? (
            <p className="text-gray-500 text-sm p-5">Cargando...</p>
          ) : pagos.length === 0 ? (
            <p className="text-gray-500 text-sm p-5">No hay pagos registrados para esta fecha.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {pagos.map((p) => (
                <div key={p.idpago} className="px-4 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium truncate">{p.nombre}</p>
                      {TIPO_BADGE[p.tipo] && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${TIPO_BADGE[p.tipo].cls}`}>
                          {TIPO_BADGE[p.tipo].label}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {fmtHora(p.fecha)} · DNI {p.dni}
                      {p.motivo ? ` · ${p.motivo}` : ""}
                    </p>
                  </div>
                  <span className={`font-bold text-sm shrink-0 ${p.tipo === 'bonificacion' ? 'text-yellow-400' : 'text-green-400'}`}>
                    {fmt(p.monto)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Modal pago manual */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 pb-4 sm:pb-0">
          <div className="bg-gray-900 rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h2 className="text-white font-bold text-lg">Registrar pago manual</h2>

            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Cliente</label>
                <SearchableSelect
                  options={clientes.map((c) => ({ value: String(c.idcliente), label: c.nombre, sublabel: c.dni }))}
                  value={clienteId}
                  onChange={setClienteId}
                  placeholder="Buscar cliente..."
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm block mb-1">Monto</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  placeholder="Ej: 5000"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm block mb-1">Motivo</label>
                <input
                  type="text"
                  placeholder="Ej: Efectivo - mes de agosto"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && registrarPago()}
                  className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setModalAbierto(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={registrarPago}
                disabled={guardando}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {guardando ? "Guardando..." : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminNav />
    </div>
  );
}
