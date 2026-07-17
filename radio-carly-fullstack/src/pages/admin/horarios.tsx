import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DIAS_CORTO = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const COLORES = [
  "bg-blue-600/30 border-blue-500 text-blue-300",
  "bg-purple-600/30 border-purple-500 text-purple-300",
  "bg-green-600/30 border-green-500 text-green-300",
  "bg-yellow-600/30 border-yellow-500 text-yellow-300",
  "bg-pink-600/30 border-pink-500 text-pink-300",
  "bg-orange-600/30 border-orange-500 text-orange-300",
  "bg-teal-600/30 border-teal-500 text-teal-300",
];

type Horario = {
  idhorario: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  idcliente: number;
  nombre: string;
};

export default function AdminHorarios() {
  const router = useRouter();
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem("admin") !== "1") { router.replace("/"); return; }
    fetch("/api/admin/horarios")
      .then((r) => r.json())
      .then((d) => { setHorarios(d); setCargando(false); });
  }, []);

  const clienteIds = [...new Set(horarios.map((h) => h.idcliente))];
  const colorPorCliente: Record<number, string> = {};
  clienteIds.forEach((id, i) => { colorPorCliente[id] = COLORES[i % COLORES.length]; });

  const porDia: Record<number, Horario[]> = {};
  for (let d = 1; d <= 7; d++) porDia[d] = [];
  horarios.forEach((h) => porDia[h.dia_semana]?.push(h));

  const hoy = new Date().getDay() === 0 ? 7 : new Date().getDay();

  return (
    <div className="min-h-[100dvh] bg-gray-950 px-4 py-6 pb-10">
      <div className="max-w-6xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/admin/clientes" className="text-gray-400 text-sm py-2 pr-1">←</Link>
            <h1 className="text-white font-bold text-xl">Calendario</h1>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/admin/config" className="text-gray-400 hover:text-white transition-colors">Precios</Link>
            <button onClick={() => { sessionStorage.removeItem("admin"); router.push("/"); }} className="text-red-400 hover:text-red-300 transition-colors">Salir</button>
          </div>
        </div>

        {cargando ? (
          <p className="text-gray-500 text-sm">Cargando...</p>
        ) : (
          <>
            {/* Leyenda */}
            {clienteIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {clienteIds.map((id) => {
                  const nombre = horarios.find((h) => h.idcliente === id)?.nombre ?? "";
                  return (
                    <Link
                      key={id}
                      href={`/admin/clientes/${id}`}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${colorPorCliente[id]} active:opacity-60 transition-opacity`}
                    >
                      {nombre}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Grilla — scroll horizontal en mobile */}
            <div className="overflow-x-auto -mx-4 px-4">
              <div className="grid grid-cols-7 gap-2 min-w-[560px] lg:min-w-0">
                {DIAS.slice(1).map((_, i) => {
                  const numDia = i + 1;
                  const slots = porDia[numDia];
                  const esHoy = numDia === hoy;

                  return (
                    <div
                      key={numDia}
                      className={`bg-gray-900 rounded-xl p-2.5 space-y-1.5 ${esHoy ? "ring-2 ring-blue-500" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <h2 className={`font-semibold text-xs ${esHoy ? "text-blue-400" : "text-gray-400"}`}>
                          <span className="hidden sm:inline">{DIAS[numDia]}</span>
                          <span className="sm:hidden">{DIAS_CORTO[numDia]}</span>
                        </h2>
                        {esHoy && (
                          <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full">Hoy</span>
                        )}
                      </div>

                      {slots.length === 0 ? (
                        <p className="text-gray-700 text-[10px]">—</p>
                      ) : (
                        <div className="space-y-1">
                          {slots.map((h) => (
                            <Link
                              key={h.idhorario}
                              href={`/admin/clientes/${h.idcliente}`}
                              className={`block border rounded-lg px-2 py-1.5 text-[10px] sm:text-xs font-medium active:opacity-60 transition-opacity ${colorPorCliente[h.idcliente]}`}
                            >
                              <div className="font-semibold truncate">{h.nombre}</div>
                              <div className="opacity-75 mt-0.5">
                                {h.hora_inicio.slice(0, 5)}–{h.hora_fin.slice(0, 5)}
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {horarios.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No hay horarios cargados aún.</p>
                <p className="text-gray-600 text-sm mt-1">Andá a un cliente y asignale horarios fijos.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
