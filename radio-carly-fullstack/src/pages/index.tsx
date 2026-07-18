import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";

type Cliente = {
  idcliente: number;
  dni: string;
  nombre: string;
  balance: number;
};

type Sesion = {
  idsesion: number;
  idhorario: number;
  asistio: number | null;
  monto: number;
  hora_inicio: string;
  hora_fin: string;
};

type Horario = {
  idhorario: number;
  hora_inicio: string;
  hora_fin: string;
  dia_nombre: string;
};

type Paso = "dni" | "sesion" | "pago" | "qr";

export default function Home() {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>("dni");
  const [dni, setDni] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState<Horario | null>(null);
  const [montoPagar, setMontoPagar] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [initPoint, setInitPoint] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function buscarCliente() {
    if (!dni.trim()) return;
    setCargando(true);
    setError("");
    try {
      const res = await fetch(`/api/clientes/${dni.trim()}`);
      if (!res.ok) {
        const authRes = await fetch("/api/admin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dni: dni.trim(), password: "" }),
        });
        const authData = await authRes.json();
        if (authRes.status === 401 && authData.error === "Contraseña incorrecta") {
          sessionStorage.setItem("adminDni", dni.trim());
          router.push("/admin");
          return;
        }
        setError("DNI no encontrado. Consultá con el administrador.");
        setCargando(false);
        return;
      }
      const data: Cliente = await res.json();
      setCliente(data);

      const resSesion = await fetch(`/api/sesiones/hoy?idcliente=${data.idcliente}`);
      const dataSesion = await resSesion.json();

      if (dataSesion.sesion) {
        setSesion(dataSesion.sesion);
        setMontoPagar(String(data.balance + dataSesion.sesion.monto));
        setPaso("pago");
      } else {
        setHorarios(dataSesion.horarios);
        setPaso("sesion");
      }
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    }
    setCargando(false);
  }

  async function registrarSesion(asistio: boolean) {
    if (!cliente || !horarioSeleccionado) return;
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/sesiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idcliente: cliente.idcliente,
          idhorario: horarioSeleccionado.idhorario,
          asistio,
        }),
      });
      const data = await res.json();
      const nuevoBalance = Number(cliente.balance) + Number(data.monto);
      setCliente({ ...cliente, balance: nuevoBalance });
      setSesion({ ...data, idhorario: horarioSeleccionado.idhorario, asistio: asistio ? 1 : 0 });
      setMontoPagar(String(nuevoBalance));
      setPaso("pago");
    } catch {
      setError("Error al registrar la sesión.");
    }
    setCargando(false);
  }

  async function generarQR() {
    if (!cliente || !montoPagar || Number(montoPagar) <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/pagos/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idcliente: cliente.idcliente, monto: Number(montoPagar) }),
      });
      const data = await res.json();
      setQrUrl(data.qr);
      setInitPoint(data.initPoint);
      setPaso("qr");
    } catch {
      setError("Error al generar el QR.");
    }
    setCargando(false);
  }

  function reiniciar() {
    setDni("");
    setCliente(null);
    setSesion(null);
    setHorarios([]);
    setHorarioSeleccionado(null);
    setMontoPagar("");
    setQrUrl("");
    setInitPoint("");
    setError("");
    setPaso("dni");
  }

  return (
    <div className="min-h-[100dvh] bg-gray-950 flex flex-col">

      {/* Header */}
      <header className="px-5 pt-10 pb-4 sm:pt-14 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">WOX Rosario</h1>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 flex flex-col justify-start sm:justify-center px-4 pb-8 sm:pb-0 w-full max-w-md mx-auto">
        <div className="bg-gray-900 rounded-2xl shadow-xl p-5 sm:p-6 space-y-4">

          {/* PASO 1: Ingresar DNI */}
          {paso === "dni" && (
            <div className="space-y-4">
              <h2 className="text-white font-semibold text-lg">Ingresá tu DNI</h2>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ej: 12345678"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buscarCliente()}
                className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-4 text-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                onClick={buscarCliente}
                disabled={cargando}
                className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-colors text-lg"
              >
                {cargando ? "Buscando..." : "Continuar"}
              </button>
            </div>
          )}

          {/* PASO 2: Registrar sesión */}
          {paso === "sesion" && cliente && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Cliente</p>
                <p className="text-white font-bold text-2xl mt-0.5">{cliente.nombre}</p>
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-gray-400 text-xs uppercase tracking-wide">Deuda actual</p>
                  <p className="text-yellow-400 font-bold text-3xl mt-0.5">
                    ${Number(cliente.balance).toLocaleString("es-AR")}
                  </p>
                </div>
              </div>

              {horarios.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-gray-400 text-sm font-medium">Horario de hoy</p>
                  {horarios.map((h) => (
                    <button
                      key={h.idhorario}
                      onClick={() => setHorarioSeleccionado(h)}
                      className={`w-full text-left px-4 py-4 rounded-xl border transition-colors ${
                        horarioSeleccionado?.idhorario === h.idhorario
                          ? "border-blue-500 bg-blue-600/20 text-white"
                          : "border-gray-700 bg-gray-800 text-gray-300"
                      }`}
                    >
                      <span className="font-semibold">{h.dia_nombre}</span>
                      <span className="text-gray-400 ml-2">{h.hora_inicio.slice(0, 5)} – {h.hora_fin.slice(0, 5)}</span>
                    </button>
                  ))}

                  {horarioSeleccionado && (
                    <div className="space-y-2 pt-1">
                      <p className="text-gray-400 text-sm">¿Asististe hoy?</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => registrarSesion(true)}
                          disabled={cargando}
                          className="flex-1 bg-green-600 hover:bg-green-500 active:bg-green-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors text-base"
                        >
                          Sí, asistí
                        </button>
                        <button
                          onClick={() => registrarSesion(false)}
                          disabled={cargando}
                          className="flex-1 bg-red-700 hover:bg-red-600 active:bg-red-800 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors text-base"
                        >
                          No asistí
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-400 text-sm">No tenés horario asignado para hoy.</p>
                  <button
                    onClick={() => setPaso("pago")}
                    className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-colors"
                  >
                    Ir a pagar deuda
                  </button>
                </div>
              )}

              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={reiniciar} className="w-full text-gray-500 text-sm py-3 transition-colors">
                ← Volver
              </button>
            </div>
          )}

          {/* PASO 3: Elegir monto */}
          {paso === "pago" && cliente && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Cliente</p>
                <p className="text-white font-bold text-2xl mt-0.5">{cliente.nombre}</p>
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-gray-400 text-xs uppercase tracking-wide">Deuda total</p>
                  <p className="text-yellow-400 font-bold text-3xl mt-0.5">
                    ${Number(cliente.balance).toLocaleString("es-AR")}
                  </p>
                  {sesion && (
                    <p className="text-gray-500 text-xs mt-1">
                      Incluye sesión de hoy: ${Number(sesion.monto).toLocaleString("es-AR")}
                      {sesion.asistio === 0 ? " (reserva)" : ""}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-gray-400 text-sm">Monto a pagar</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={montoPagar}
                  onChange={(e) => setMontoPagar(e.target.value)}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-4 text-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setMontoPagar(String(cliente.balance))}
                  className="text-blue-400 text-sm py-1"
                >
                  Pagar total (${Number(cliente.balance).toLocaleString("es-AR")})
                </button>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                onClick={generarQR}
                disabled={cargando || !montoPagar || Number(montoPagar) <= 0}
                className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors text-lg"
              >
                {cargando ? "Generando QR..." : "Generar QR de pago"}
              </button>
              <button onClick={reiniciar} className="w-full text-gray-500 text-sm py-3 transition-colors">
                ← Volver
              </button>
            </div>
          )}

          {/* PASO 4: Mostrar QR */}
          {paso === "qr" && cliente && (
            <div className="space-y-4 text-center">
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Pagando</p>
                <p className="text-white font-bold text-xl mt-0.5">{cliente.nombre}</p>
                <p className="text-green-400 font-bold text-3xl mt-1">
                  ${Number(montoPagar).toLocaleString("es-AR")}
                </p>
              </div>

              <p className="text-gray-400 text-sm">Escaneá el código con la app de Mercado Pago</p>

              {qrUrl && (
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-2xl inline-block shadow-lg">
                    <Image
                      src={qrUrl}
                      alt="QR Mercado Pago"
                      width={280}
                      height={280}
                      className="w-[240px] h-[240px] sm:w-[280px] sm:h-[280px]"
                    />
                  </div>
                </div>
              )}

              <a
                href={initPoint}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gray-800 hover:bg-gray-700 active:bg-gray-900 text-white font-semibold py-4 rounded-xl transition-colors text-center"
              >
                Abrir en Mercado Pago
              </a>

              <button onClick={reiniciar} className="w-full text-gray-500 text-sm py-3 transition-colors">
                Nueva consulta
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
