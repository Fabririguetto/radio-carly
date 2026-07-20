import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

type Horario = { idhorario: number; dia_semana: number; hora_inicio: string; hora_fin: string; sala_nombre?: string | null };
type Sesion = { idsesion: number; fecha: string; asistio: number; monto: number; hora_inicio: string; hora_fin: string };
type Pago = { idpago: number; monto: number; estado: string; fecha: string };
type Cliente = { idcliente: number; nombre: string; dni: string; ingreso: number; egreso: number; balance: number; activo: number };

export default function ClienteDetalle() {
  const router = useRouter();
  const { id } = router.query as { id: string };

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!id) return;
    cargar();
  }, [id]);

  async function cargar() {
    const [resDetalle, resHorarios] = await Promise.all([
      fetch(`/api/admin/clientes/${id}`),
      fetch(`/api/admin/clientes/${id}/horarios`),
    ]);
    if (resDetalle.status === 401) { router.replace("/admin"); return; }
    const detalle = await resDetalle.json();
    setCliente(detalle.cliente);
    setSesiones(detalle.sesiones);
    setPagos(detalle.pagos);
    setHorarios(await resHorarios.json());
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
    <div className="min-h-[100dvh] bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Cargando...</p>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-gray-950 px-4 py-6 pb-10">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/admin/clientes" className="text-gray-400 text-sm py-2 pr-1">←</Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-white font-bold text-xl leading-tight">{cliente.nombre}</h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                cliente.activo ? "bg-green-600/20 text-green-400" : "bg-gray-600/30 text-gray-400"
              }`}>
                {cliente.activo ? "Activo" : "Inactivo"}
              </span>
            </div>
            <p className="text-gray-500 text-xs">DNI {cliente.dni}</p>
          </div>
        </div>

        {/* Cuenta corriente */}
        <div className="bg-gray-900 rounded-2xl p-4 grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-gray-500 text-xs">Cobrado</p>
            <p className="text-white font-bold text-base mt-0.5">${Number(cliente.egreso).toLocaleString("es-AR")}</p>
          </div>
          <div className="text-center border-x border-gray-800">
            <p className="text-gray-500 text-xs">Pagado</p>
            <p className="text-green-400 font-bold text-base mt-0.5">${Number(cliente.ingreso).toLocaleString("es-AR")}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-xs">Deuda</p>
            <p className={`font-bold text-base mt-0.5 ${Number(cliente.balance) > 0 ? "text-yellow-400" : "text-green-400"}`}>
              ${Number(cliente.balance).toLocaleString("es-AR")}
            </p>
          </div>
        </div>

        {/* Horarios fijos */}
        <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
          <h2 className="text-white font-semibold">Horarios fijos</h2>

          {horarios.length > 0 ? (
            <div className="space-y-2">
              {horarios.map((h) => (
                <div key={h.idhorario} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                  <div className="text-sm">
                    <span className="text-white font-medium">{DIAS[h.dia_semana]}</span>
                    <span className="text-gray-400 ml-2">{h.hora_inicio.slice(0, 5)} – {h.hora_fin.slice(0, 5)}</span>
                    {h.sala_nombre && <span className="text-gray-500 ml-2 text-xs">{h.sala_nombre}</span>}
                  </div>
                  <button
                    onClick={() => eliminarHorario(h.idhorario)}
                    className="text-red-400 text-sm px-2 py-1 rounded-lg active:bg-red-900/30 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Sin horarios asignados.</p>
          )}

          {/* Link al calendario para agregar */}
          <Link
            href={`/admin/horarios?cliente=${id}`}
            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors"
          >
            + Agregar en el calendario
          </Link>
        </div>

        {/* Últimas sesiones — cards en mobile */}
        <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
          <h2 className="text-white font-semibold">Últimas sesiones</h2>
          {sesiones.length === 0 ? (
            <p className="text-gray-500 text-sm">Sin sesiones registradas.</p>
          ) : (
            <div className="space-y-2">
              {sesiones.map((s) => (
                <div key={s.idsesion} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-white text-sm font-medium">
                      {new Date(s.fecha).toLocaleDateString("es-AR")}
                    </p>
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
        </div>

        {/* Últimos pagos — cards en mobile */}
        <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
          <h2 className="text-white font-semibold">Últimos pagos</h2>
          {pagos.length === 0 ? (
            <p className="text-gray-500 text-sm">Sin pagos registrados.</p>
          ) : (
            <div className="space-y-2">
              {pagos.map((p) => (
                <div key={p.idpago} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-white text-sm font-medium">{new Date(p.fecha).toLocaleDateString("es-AR")}</p>
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
        </div>

        {/* Estado del cliente */}
        <div className="bg-gray-900 rounded-2xl p-4 space-y-3">
          <h2 className="text-white font-semibold">Estado del cliente</h2>
          <p className="text-gray-400 text-sm">
            {cliente.activo
              ? "El cliente puede registrar sesiones en el kiosco."
              : "El cliente está desactivado y no aparece en el kiosco."}
          </p>
          <button
            onClick={toggleActivo}
            disabled={toggling}
            className={`w-full font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 ${
              cliente.activo
                ? "bg-red-700 hover:bg-red-600 active:bg-red-800 text-white"
                : "bg-green-700 hover:bg-green-600 active:bg-green-800 text-white"
            }`}
          >
            {toggling ? "Guardando..." : cliente.activo ? "Desactivar cliente" : "Reactivar cliente"}
          </button>
        </div>

      </div>
    </div>
  );
}
