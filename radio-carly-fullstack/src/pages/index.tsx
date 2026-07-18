import { useState, useEffect, useRef } from "react";
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

const QR_TTL = 60;

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
  const [qrPos, setQrPos] = useState("");
  const [qrTipo, setQrTipo] = useState<"camara" | "app">("camara");
  const [initPoint, setInitPoint] = useState("");
  const [preferenceId, setPreferenceId] = useState("");
  const [pagoCobrado, setPagoCobrado] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState(QR_TTL);
  const [qrVencido, setQrVencido] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const dniInputRef = useRef<HTMLInputElement>(null);
  const montoInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-focus inputs al cambiar de paso
  useEffect(() => {
    const t = setTimeout(() => {
      if (paso === "dni") dniInputRef.current?.focus();
      if (paso === "pago") montoInputRef.current?.focus();
    }, 80);
    return () => clearTimeout(t);
  }, [paso]);

  // Auto-seleccionar horario si hay uno solo
  useEffect(() => {
    if (paso === "sesion" && horarios.length === 1) {
      setHorarioSeleccionado(horarios[0]);
    }
  }, [paso, horarios]);

  // Teclado global para el paso de sesión
  useEffect(() => {
    if (paso !== "sesion" || cargando) return;

    function handleKey(e: KeyboardEvent) {
      // Ignorar teclas de modificadores
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const key = e.key;

      // Números 1-9: seleccionar horario N
      const n = parseInt(key);
      if (!isNaN(n) && n >= 1 && n <= horarios.length) {
        setHorarioSeleccionado(horarios[n - 1]);
        return;
      }

      if (key === "Enter") {
        if (horarioSeleccionado) {
          // Sí asistí
          e.preventDefault();
        } else if (horarios.length === 0) {
          // Sin horario → ir a pagar
          setPaso("pago");
        }
      }

      if ((key === "0" || key === "*") && horarioSeleccionado) {
        // No asistí
        return;
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [paso, cargando, horarios, horarioSeleccionado]); // eslint-disable-line react-hooks/exhaustive-deps

  // Teclado global para confirmar asistencia (Enter/0 cuando horario ya está seleccionado)
  useEffect(() => {
    if (paso !== "sesion" || cargando || !horarioSeleccionado) return;

    function handleKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === "Enter") {
        e.preventDefault();
        registrarSesion(true);
      } else if (e.key === "0" || e.key === "*") {
        e.preventDefault();
        registrarSesion(false);
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [paso, cargando, horarioSeleccionado]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling: detecta pago aprobado cada 3s
  useEffect(() => {
    if (paso !== "qr" || !preferenceId || pagoCobrado || qrVencido) return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/pagos/estado?preferenceId=${preferenceId}`);
        if (!res.ok) return;
        const { estado } = await res.json();
        if (estado === "aprobado") {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          setPagoCobrado(true);
          setTimeout(() => reiniciar(), 3000);
        }
      } catch {
        // network errors during polling are silent
      }
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [paso, preferenceId, pagoCobrado, qrVencido]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown: 60 segundos de vida del QR
  useEffect(() => {
    if (paso !== "qr" || pagoCobrado || qrVencido) return;

    setTiempoRestante(QR_TTL);
    countdownRef.current = setInterval(() => {
      setTiempoRestante((t) => {
        if (t <= 1) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          setQrVencido(true);
          setTimeout(() => reiniciar(), 2000);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [paso, preferenceId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setQrVencido(false);
    setPagoCobrado(false);
    try {
      const res = await fetch("/api/pagos/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idcliente: cliente.idcliente, monto: Number(montoPagar) }),
      });
      const data = await res.json();
      setQrUrl(data.qr);
      setQrPos(data.qrPos || "");
      setQrTipo("camara");
      setInitPoint(data.initPoint);
      setPreferenceId(data.preferenceId || "");
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
    setQrPos("");
    setQrTipo("camara");
    setInitPoint("");
    setPreferenceId("");
    setPagoCobrado(false);
    setQrVencido(false);
    setTiempoRestante(QR_TTL);
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
    setError("");
    setPaso("dni");
  }

  const countdownColor =
    tiempoRestante > 30 ? "text-gray-400" :
    tiempoRestante > 10 ? "text-yellow-400" :
    "text-red-400";

  return (
    <div className="min-h-[100dvh] bg-gray-950 flex flex-col">

      <header className="px-5 pt-10 pb-4 sm:pt-14 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">WOX Rosario</h1>
      </header>

      <main className="flex-1 flex flex-col justify-start sm:justify-center px-4 pb-8 sm:pb-0 w-full max-w-md mx-auto">
        <div className="bg-gray-900 rounded-2xl shadow-xl p-5 sm:p-6 space-y-4">

          {/* PASO 1: Ingresar DNI */}
          {paso === "dni" && (
            <div className="space-y-4">
              <h2 className="text-white font-semibold text-lg">Ingresá tu DNI</h2>
              <input
                ref={dniInputRef}
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
                  {horarios.map((h, i) => (
                    <button
                      key={h.idhorario}
                      onClick={() => setHorarioSeleccionado(h)}
                      className={`w-full text-left px-4 py-4 rounded-xl border transition-colors ${
                        horarioSeleccionado?.idhorario === h.idhorario
                          ? "border-blue-500 bg-blue-600/20 text-white"
                          : "border-gray-700 bg-gray-800 text-gray-300"
                      }`}
                    >
                      {horarios.length > 1 && (
                        <span className="text-gray-500 text-xs mr-2">[{i + 1}]</span>
                      )}
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
                          <span className="block">Sí, asistí</span>
                          <span className="block text-green-300 text-xs font-normal mt-0.5">Enter</span>
                        </button>
                        <button
                          onClick={() => registrarSesion(false)}
                          disabled={cargando}
                          className="flex-1 bg-red-700 hover:bg-red-600 active:bg-red-800 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors text-base"
                        >
                          <span className="block">No asistí</span>
                          <span className="block text-red-300 text-xs font-normal mt-0.5">0 / *</span>
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
                    <span className="block">Ir a pagar deuda</span>
                    <span className="block text-blue-300 text-xs font-normal mt-0.5">Enter</span>
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
                  ref={montoInputRef}
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={montoPagar}
                  onChange={(e) => setMontoPagar(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !cargando && Number(montoPagar) > 0) generarQR();
                  }}
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-4 text-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => {
                    setMontoPagar(String(cliente.balance));
                    montoInputRef.current?.focus();
                  }}
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
                <span className="block">{cargando ? "Generando QR..." : "Generar QR de pago"}</span>
                {!cargando && <span className="block text-blue-300 text-xs font-normal mt-0.5">Enter</span>}
              </button>
              <button onClick={reiniciar} className="w-full text-gray-500 text-sm py-3 transition-colors">
                ← Volver
              </button>
            </div>
          )}

          {/* PASO 4: Mostrar QR */}
          {paso === "qr" && cliente && (
            <div className="space-y-4 text-center">

              {pagoCobrado ? (
                <div className="py-8 space-y-4">
                  <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-green-600/20 flex items-center justify-center">
                      <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-white font-bold text-2xl">¡Pago recibido!</p>
                    <p className="text-gray-400 text-sm mt-1">
                      ${Number(montoPagar).toLocaleString("es-AR")} · {cliente.nombre}
                    </p>
                  </div>
                  <p className="text-gray-500 text-sm">Volviendo al inicio...</p>
                </div>

              ) : qrVencido ? (
                <div className="py-8 space-y-4">
                  <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-yellow-600/20 flex items-center justify-center">
                      <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-white font-bold text-xl">QR vencido</p>
                    <p className="text-gray-400 text-sm mt-1">El código expiró.</p>
                  </div>
                  <p className="text-gray-500 text-sm">Volviendo al inicio...</p>
                </div>

              ) : (
                <>
                  <div className="bg-gray-800 rounded-xl p-4">
                    <p className="text-gray-400 text-xs uppercase tracking-wide">Pagando</p>
                    <p className="text-white font-bold text-xl mt-0.5">{cliente.nombre}</p>
                    <p className="text-green-400 font-bold text-3xl mt-1">
                      ${Number(montoPagar).toLocaleString("es-AR")}
                    </p>
                  </div>

                  {qrPos && (
                    <div className="flex gap-1 bg-gray-800 rounded-xl p-1">
                      <button
                        onClick={() => setQrTipo("camara")}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${qrTipo === "camara" ? "bg-gray-600 text-white" : "text-gray-400"}`}
                      >
                        Cámara
                      </button>
                      <button
                        onClick={() => setQrTipo("app")}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${qrTipo === "app" ? "bg-blue-600 text-white" : "text-gray-400"}`}
                      >
                        App MP
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between px-1">
                    <p className="text-gray-400 text-sm">
                      {qrPos && qrTipo === "app"
                        ? "Escaneá con la app de Mercado Pago"
                        : "Escaneá con la cámara de tu teléfono"}
                    </p>
                    <p className={`text-sm font-mono font-semibold tabular-nums ${countdownColor}`}>
                      {String(Math.floor(tiempoRestante / 60)).padStart(2, "0")}:{String(tiempoRestante % 60).padStart(2, "0")}
                    </p>
                  </div>

                  {qrUrl && (
                    <div className="flex justify-center">
                      <div className="bg-white p-3 rounded-2xl inline-block shadow-lg">
                        <Image
                          src={qrTipo === "app" && qrPos ? qrPos : qrUrl}
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
                </>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
