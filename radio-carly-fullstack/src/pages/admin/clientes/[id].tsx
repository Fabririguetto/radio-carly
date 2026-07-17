import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

type Horario = { idhorario: number; dia_semana: number; hora_inicio: string; hora_fin: string };
type Sesion = { idsesion: number; fecha: string; asistio: number; monto: number; hora_inicio: string; hora_fin: string };
type Pago = { idpago: number; monto: number; estado: string; fecha: string };
type Cliente = { idcliente: number; nombre: string; dni: string; ingreso: number; egreso: number; balance: number };

export default function ClienteDetalle() {
  const router = useRouter();
  const { id } = router.query as { id: string };

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [dia, setDia] = useState("1");
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFin, setHoraFin] = useState("09:00");
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  useEffect(() => {
    if (!id) return;
    if (sessionStorage.getItem("admin") !== "1") { router.replace("/"); return; }
    cargar();
  }, [id]);

  async function cargar() {
    const [resDetalle, resHorarios] = await Promise.all([
      fetch(`/api/admin/clientes/${id}`),
      fetch(`/api/admin/clientes/${id}/horarios`),
    ]);
    const detalle = await resDetalle.json();
    setCliente(detalle.cliente);
    setSesiones(detalle.sesiones);
    setPagos(detalle.pagos);
    setHorarios(await resHorarios.json());
  }

  async function agregarHorario() {
    setError(""); setExito("");
    const res = await fetch(`/api/admin/clientes/${id}/horarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dia_semana: Number(dia), hora_inicio: horaInicio, hora_fin: horaFin }),
    });
    if (res.ok) { setExito("Horario agregado."); cargar(); }
    else { const d = await res.json(); setError(d.error); }
  }

  async function eliminarHorario(idhorario: number) {
    await fetch(`/api/admin/horarios/${idhorario}`, { method: "DELETE" });
    cargar();
  }

  if (!cliente) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><p className="text-gray-400">Cargando...</p></div>;

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/admin/clientes" className="text-gray-400 hover:text-white transition-colors">← Volver</Link>
          <h1 className="text-white font-bold text-2xl">{cliente.nombre}</h1>
        </div>

        {/* Cuenta corriente */}
        <div className="bg-gray-900 rounded-2xl p-5 grid grid-cols-3 gap-4">
          <div>
            <p className="text-gray-400 text-xs">Total cobrado</p>
            <p className="text-white font-bold text-lg">${Number(cliente.egreso).toLocaleString("es-AR")}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Total pagado</p>
            <p className="text-green-400 font-bold text-lg">${Number(cliente.ingreso).toLocaleString("es-AR")}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Deuda actual</p>
            <p className={`font-bold text-lg ${Number(cliente.balance) > 0 ? "text-yellow-400" : "text-green-400"}`}>
              ${Number(cliente.balance).toLocaleString("es-AR")}
            </p>
          </div>
        </div>

        {/* Horarios */}
        <div className="bg-gray-900 rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-semibold">Horarios fijos</h2>

          {horarios.length > 0 ? (
            <div className="space-y-2">
              {horarios.map((h) => (
                <div key={h.idhorario} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-2">
                  <span className="text-white text-sm">{DIAS[h.dia_semana]} — {h.hora_inicio.slice(0,5)} a {h.hora_fin.slice(0,5)}</span>
                  <button onClick={() => eliminarHorario(h.idhorario)} className="text-red-400 hover:text-red-300 text-xs transition-colors">Eliminar</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Sin horarios asignados.</p>
          )}

          <div className="flex gap-2 flex-wrap">
            <select value={dia} onChange={(e) => setDia(e.target.value)} className="bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none">
              {DIAS.slice(1).map((d, i) => <option key={i+1} value={i+1}>{d}</option>)}
            </select>
            <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none" />
            <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className="bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none" />
            <button onClick={agregarHorario} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">Agregar</button>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {exito && <p className="text-green-400 text-sm">{exito}</p>}
        </div>

        {/* Últimas sesiones */}
        <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
          <h2 className="text-white font-semibold">Últimas sesiones</h2>
          {sesiones.length === 0 ? (
            <p className="text-gray-500 text-sm">Sin sesiones registradas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr>
                <th className="text-left text-gray-400 py-2 font-medium">Fecha</th>
                <th className="text-left text-gray-400 py-2 font-medium">Horario</th>
                <th className="text-left text-gray-400 py-2 font-medium">Asistencia</th>
                <th className="text-right text-gray-400 py-2 font-medium">Monto</th>
              </tr></thead>
              <tbody>
                {sesiones.map((s) => (
                  <tr key={s.idsesion} className="border-t border-gray-800">
                    <td className="text-white py-2">{new Date(s.fecha).toLocaleDateString("es-AR")}</td>
                    <td className="text-gray-400 py-2">{s.hora_inicio?.slice(0,5)} - {s.hora_fin?.slice(0,5)}</td>
                    <td className="py-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.asistio ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"}`}>
                        {s.asistio ? "Asistió" : "Reserva"}
                      </span>
                    </td>
                    <td className="text-right text-white py-2">${Number(s.monto).toLocaleString("es-AR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Últimos pagos */}
        <div className="bg-gray-900 rounded-2xl p-5 space-y-3">
          <h2 className="text-white font-semibold">Últimos pagos</h2>
          {pagos.length === 0 ? (
            <p className="text-gray-500 text-sm">Sin pagos registrados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr>
                <th className="text-left text-gray-400 py-2 font-medium">Fecha</th>
                <th className="text-left text-gray-400 py-2 font-medium">Estado</th>
                <th className="text-right text-gray-400 py-2 font-medium">Monto</th>
              </tr></thead>
              <tbody>
                {pagos.map((p) => (
                  <tr key={p.idpago} className="border-t border-gray-800">
                    <td className="text-white py-2">{new Date(p.fecha).toLocaleDateString("es-AR")}</td>
                    <td className="py-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        p.estado === "aprobado" ? "bg-green-600/20 text-green-400" :
                        p.estado === "rechazado" ? "bg-red-600/20 text-red-400" :
                        "bg-yellow-600/20 text-yellow-400"
                      }`}>{p.estado}</span>
                    </td>
                    <td className="text-right text-white py-2">${Number(p.monto).toLocaleString("es-AR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
