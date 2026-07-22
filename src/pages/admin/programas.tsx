import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminNav from "@/components/AdminNav";
import SearchableSelect from "@/components/SearchableSelect";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

type Horario = {
  idprograma_horario?: number;
  idestudio: number;
  estudio_nombre?: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
};

type Programa = {
  idprograma: number;
  idcliente: number;
  cliente_nombre: string;
  nombre: string;
  descripcion: string | null;
  dni_responsable: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  activo: number;
  horarios: Horario[];
};

type Cliente = { idcliente: number; nombre: string; dni: string };
type Estudio = { idestudio: number; nombre: string };

function fmtFecha(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

const emptyForm = () => ({
  idcliente: "",
  nombre: "",
  descripcion: "",
  dni_responsable: "",
  fecha_inicio: new Date().toISOString().slice(0, 10),
  fecha_fin: "",
  horarios: [] as Horario[],
});

export default function AdminProgramas() {
  const router = useRouter();
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [cargando, setCargando] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [estudios, setEstudios] = useState<Estudio[]>([]);

  const [filtro, setFiltro] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Programa | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // Nuevo horario en el form
  const [nuevoHor, setNuevoHor] = useState({ idestudio: "", dia_semana: "1", hora_inicio: "", hora_fin: "" });

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    const [resP, resC, resE] = await Promise.all([
      fetch("/api/admin/programas"),
      fetch("/api/admin/clientes?estado=activo"),
      fetch("/api/admin/estudios"),
    ]);
    if (resP.status === 401) { router.replace("/admin"); return; }
    setProgramas(await resP.json());
    setClientes(await resC.json());
    setEstudios(await resE.json());
    setCargando(false);
  }

  function abrirNuevo() {
    setEditando(null);
    setForm(emptyForm());
    setNuevoHor({ idestudio: "", dia_semana: "1", hora_inicio: "", hora_fin: "" });
    setError("");
    setModalAbierto(true);
  }

  function abrirEditar(p: Programa) {
    setEditando(p);
    setForm({
      idcliente: String(p.idcliente),
      nombre: p.nombre,
      descripcion: p.descripcion ?? "",
      dni_responsable: p.dni_responsable ?? "",
      fecha_inicio: p.fecha_inicio.slice(0, 10),
      fecha_fin: p.fecha_fin ? p.fecha_fin.slice(0, 10) : "",
      horarios: p.horarios.map((h) => ({ ...h })),
    });
    setNuevoHor({ idestudio: "", dia_semana: "1", hora_inicio: "", hora_fin: "" });
    setError("");
    setModalAbierto(true);
  }

  function agregarHorario() {
    if (!nuevoHor.idestudio || !nuevoHor.hora_inicio || !nuevoHor.hora_fin) {
      setError("Completá todos los campos del horario."); return;
    }
    if (nuevoHor.hora_fin <= nuevoHor.hora_inicio) {
      setError("La hora de fin debe ser posterior al inicio."); return;
    }
    setError("");
    const est = estudios.find((e) => e.idestudio === Number(nuevoHor.idestudio));
    setForm((f) => ({
      ...f,
      horarios: [...f.horarios, {
        idestudio: Number(nuevoHor.idestudio),
        estudio_nombre: est?.nombre,
        dia_semana: Number(nuevoHor.dia_semana),
        hora_inicio: nuevoHor.hora_inicio,
        hora_fin: nuevoHor.hora_fin,
      }],
    }));
    setNuevoHor((h) => ({ ...h, hora_inicio: "", hora_fin: "" }));
  }

  function quitarHorario(idx: number) {
    setForm((f) => ({ ...f, horarios: f.horarios.filter((_, i) => i !== idx) }));
  }

  async function guardar() {
    if (!form.idcliente || !form.nombre.trim() || !form.fecha_inicio) {
      setError("Cliente, nombre y fecha de inicio son obligatorios."); return;
    }
    setGuardando(true); setError("");
    const body = {
      idcliente: Number(form.idcliente),
      nombre: form.nombre,
      descripcion: form.descripcion,
      dni_responsable: form.dni_responsable,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin || null,
      horarios: form.horarios,
    };

    const res = editando
      ? await fetch("/api/admin/programas", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idprograma: editando.idprograma, activo: editando.activo, ...body }),
        })
      : await fetch("/api/admin/programas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Error al guardar.");
    } else {
      setModalAbierto(false);
      cargar();
    }
    setGuardando(false);
  }

  async function eliminar(idprograma: number) {
    if (!confirm("¿Eliminás este programa?")) return;
    await fetch("/api/admin/programas", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idprograma }),
    });
    cargar();
  }

  return (
    <div className="min-h-[100dvh] bg-gray-950 px-4 py-6 pb-6 sm:pl-64">
      <div className="max-w-2xl mx-auto space-y-4">

        <div className="flex items-center justify-between pl-12">
          <h1 className="text-white font-bold text-xl">Programas</h1>
          <button onClick={abrirNuevo}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
            + Nuevo
          </button>
        </div>

        <input
          type="text"
          placeholder="Buscar por programa o cliente..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="w-full bg-gray-900 text-white placeholder-gray-500 border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          {cargando ? (
            <p className="text-gray-500 text-sm p-5">Cargando...</p>
          ) : programas.length === 0 ? (
            <p className="text-gray-500 text-sm p-5">No hay programas cargados.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {programas.filter((p) => {
                if (!filtro.trim()) return true;
                const q = filtro.toLowerCase();
                return p.nombre.toLowerCase().includes(q) || p.cliente_nombre.toLowerCase().includes(q);
              }).map((p) => (
                <div key={p.idprograma} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-medium">{p.nombre}</p>
                        {!p.activo && <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded-full">Inactivo</span>}
                      </div>
                      <p className="text-blue-400 text-sm">{p.cliente_nombre}</p>
                      {p.descripcion && <p className="text-gray-400 text-xs mt-0.5">{p.descripcion}</p>}
                      <p className="text-gray-600 text-xs mt-1">
                        {fmtFecha(p.fecha_inicio)}{p.fecha_fin ? ` — ${fmtFecha(p.fecha_fin)}` : " — sin vencimiento"}
                        {p.dni_responsable && ` · Resp: ${p.dni_responsable}`}
                      </p>
                      {p.horarios.length > 0 && (
                        <div className="mt-2 space-y-0.5">
                          {p.horarios.map((h, i) => (
                            <p key={i} className="text-gray-500 text-xs">
                              {DIAS[h.dia_semana]} {h.hora_inicio.slice(0, 5)}–{h.hora_fin.slice(0, 5)} · {h.estudio_nombre}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => abrirEditar(p)}
                        className="text-blue-400 text-sm px-2 py-1 rounded-lg hover:bg-blue-900/20 transition-colors">
                        Editar
                      </button>
                      <button onClick={() => eliminar(p.idprograma)}
                        className="text-red-400 text-sm px-2 py-1 rounded-lg hover:bg-red-900/30 transition-colors">
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Modal crear/editar */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 pb-4 sm:pb-0">
          <div className="bg-gray-900 rounded-2xl p-5 w-full max-w-md max-h-[90dvh] overflow-y-auto space-y-4">
            <h2 className="text-white font-bold text-lg">{editando ? "Editar programa" : "Nuevo programa"}</h2>

            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Cliente</label>
                <SearchableSelect
                  options={clientes.map((c) => ({ value: String(c.idcliente), label: c.nombre, sublabel: c.dni }))}
                  value={form.idcliente}
                  onChange={(v) => {
                    const cli = clientes.find((c) => String(c.idcliente) === v);
                    setForm((f) => ({ ...f, idcliente: v, dni_responsable: cli?.dni ?? f.dni_responsable }));
                  }}
                  placeholder="Buscar cliente..."
                />
              </div>

              <div>
                <label className="text-gray-400 text-sm block mb-1">Nombre del programa</label>
                <input type="text" placeholder="Ej: La Mañana de Radio X"
                  value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="text-gray-400 text-sm block mb-1">Descripción (opcional)</label>
                <textarea rows={2} placeholder="Breve descripción..."
                  value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <div>
                <label className="text-gray-400 text-sm block mb-1">DNI responsable (opcional)</label>
                <input type="text" inputMode="numeric" placeholder="Ej: 20123456"
                  value={form.dni_responsable} onChange={(e) => setForm((f) => ({ ...f, dni_responsable: e.target.value }))}
                  className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Fecha inicio</label>
                  <input type="date" value={form.fecha_inicio}
                    onChange={(e) => setForm((f) => ({ ...f, fecha_inicio: e.target.value }))}
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-1">Fecha fin (opcional)</label>
                  <input type="date" value={form.fecha_fin}
                    onChange={(e) => setForm((f) => ({ ...f, fecha_fin: e.target.value }))}
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Horarios */}
              <div>
                <label className="text-gray-400 text-sm block mb-2">Horarios por estudio</label>

                {form.horarios.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {form.horarios.map((h, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                        <span className="text-gray-300 text-sm">
                          {DIAS[h.dia_semana]} {h.hora_inicio.slice(0, 5)}–{h.hora_fin.slice(0, 5)} · {h.estudio_nombre}
                        </span>
                        <button onClick={() => quitarHorario(i)} className="text-red-400 text-xs ml-2">Quitar</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-gray-800 rounded-xl p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <SearchableSelect
                      options={estudios.map((e) => ({ value: String(e.idestudio), label: e.nombre }))}
                      value={nuevoHor.idestudio}
                      onChange={(v) => setNuevoHor((h) => ({ ...h, idestudio: v }))}
                      placeholder="Estudio"
                      compact
                    />
                    <select value={nuevoHor.dia_semana}
                      onChange={(e) => setNuevoHor((h) => ({ ...h, dia_semana: e.target.value }))}
                      className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
                      {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="time" value={nuevoHor.hora_inicio}
                      onChange={(e) => setNuevoHor((h) => ({ ...h, hora_inicio: e.target.value }))}
                      className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none" />
                    <input type="time" value={nuevoHor.hora_fin}
                      onChange={(e) => setNuevoHor((h) => ({ ...h, hora_fin: e.target.value }))}
                      className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  </div>
                  <button onClick={agregarHorario}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm py-2 rounded-lg transition-colors">
                    + Agregar horario
                  </button>
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setModalAbierto(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminNav />
    </div>
  );
}
