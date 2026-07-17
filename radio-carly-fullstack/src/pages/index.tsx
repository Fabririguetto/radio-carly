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
        // Verificar si es el DNI maestro para redirigir al admin
        const authRes = await fetch("/api/admin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dni: dni.trim() }),
        });
        if (authRes.ok) {
          sessionStorage.setItem("admin", "1");
          router.push("/admin/clientes");
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
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo / Título */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">WOX Rosario</h1>
        </div>

        <div className="bg-gray-900 rounded-2xl shadow-xl p-6 space-y-5">

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
                className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                onClick={buscarCliente}
                disabled={cargando}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {cargando ? "Buscando..." : "Continuar"}
              </button>
            </div>
          )}

          {/* PASO 2: Registrar sesión */}
          {paso === "sesion" && cliente && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Cliente</p>
                <p className="text-white font-semibold text-xl">{cliente.nombre}</p>
                <p className="text-gray-400 text-sm mt-2">Deuda actual</p>
                <p className="text-yellow-400 font-bold text-2xl">
                  ${Number(cliente.balance).toLocaleString("es-AR")}
                </p>
              </div>

              {horarios.length > 0 ? (
                <div className="space-y-3">
                  <h2 className="text-white font-semibold">Horario de hoy</h2>
                  {horarios.map((h) => (
                    <button
                      key={h.idhorario}
                      onClick={() => setHorarioSeleccionado(h)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                        horarioSeleccionado?.idhorario === h.idhorario
                          ? "border-blue-500 bg-blue-600/20 text-white"
                          : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500"
                      }`}
                    >
                      {h.dia_nombre} — {h.hora_inicio.slice(0, 5)} a {h.hora_fin.slice(0, 5)}
                    </button>
                  ))}

                  {horarioSeleccionado && (
                    <div className="space-y-2 pt-2">
                      <p className="text-gray-400 text-sm">¿Asististe hoy?</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => registrarSesion(true)}
                          disabled={cargando}
                          className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
                        >
                          Sí, asistí
                        </button>
                        <button
                          onClick={() => registrarSesion(false)}
                          disabled={cargando}
                          className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
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
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors"
                  >
                    Ir a pagar deuda
                  </button>
                </div>
              )}

              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={reiniciar} className="w-full text-gray-500 hover:text-gray-300 text-sm py-2 transition-colors">
                Volver
              </button>
            </div>
          )}

          {/* PASO 3: Elegir monto a pagar */}
          {paso === "pago" && cliente && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Cliente</p>
                <p className="text-white font-semibold text-xl">{cliente.nombre}</p>
                <p className="text-gray-400 text-sm mt-2">Deuda total</p>
                <p className="text-yellow-400 font-bold text-2xl">
                  ${Number(cliente.balance).toLocaleString("es-AR")}
                </p>
                {sesion && (
                  <p className="text-gray-500 text-xs mt-1">
                    Incluye sesión de hoy: ${Number(sesion.monto).toLocaleString("es-AR")}
                    {sesion.asistio === 0 ? " (reserva)" : ""}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-gray-400 text-sm">Monto a pagar</label>
                <input
                  type="number"
                  min="1"
                  value={montoPagar}
                  onChange={(e) => setMontoPagar(e.target.value)}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setMontoPagar(String(cliente.balance))}
                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                >
                  Pagar total (${Number(cliente.balance).toLocaleString("es-AR")})
                </button>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                onClick={generarQR}
                disabled={cargando || !montoPagar || Number(montoPagar) <= 0}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {cargando ? "Generando QR..." : "Generar QR de pago"}
              </button>
              <button onClick={reiniciar} className="w-full text-gray-500 hover:text-gray-300 text-sm py-2 transition-colors">
                Volver
              </button>
            </div>
          )}

          {/* PASO 4: Mostrar QR */}
          {paso === "qr" && cliente && (
            <div className="space-y-4 text-center">
              <div className="bg-gray-800 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Pagando</p>
                <p className="text-white font-semibold">{cliente.nombre}</p>
                <p className="text-green-400 font-bold text-2xl mt-1">
                  ${Number(montoPagar).toLocaleString("es-AR")}
                </p>
              </div>

              <p className="text-gray-400 text-sm">Escaneá el código con la app de Mercado Pago</p>

              {qrUrl && (
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-xl inline-block">
                    <Image src={qrUrl} alt="QR Mercado Pago" width={260} height={260} />
                  </div>
                </div>
              )}

              <a
                href={initPoint}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-blue-500 hover:bg-blue-400 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Abrir en Mercado Pago
              </a>

              <button onClick={reiniciar} className="w-full text-gray-500 hover:text-gray-300 text-sm py-2 transition-colors">
                Nueva consulta
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
