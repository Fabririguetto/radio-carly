import { useState, useEffect, useRef } from "react";
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
  dia_semana: number;
};

type Paso = "dni" | "pago" | "qr";

const TTL = 60;

export default function Home() {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>("dni");
  const [dni, setDni] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [montoPagar, setMontoPagar] = useState("");
  const [qrPos, setQrPos] = useState("");
  const [orderId, setOrderId] = useState("");
  const [pagoCobrado, setPagoCobrado] = useState(false);

  const [tiempoSesion, setTiempoSesion] = useState(TTL);
  const [sesionExpirada, setSesionExpirada] = useState(false);
  const sesionCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [tiempoQR, setTiempoQR] = useState(TTL);
  const [qrVencido, setQrVencido] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const dniInputRef = useRef<HTMLInputElement>(null);
  const montoInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus inputs al cambiar de paso
  useEffect(() => {
    const t = setTimeout(() => {
      if (paso === "dni") dniInputRef.current?.focus();
      if (paso === "pago") montoInputRef.current?.focus();
    }, 80);
    return () => clearTimeout(t);
  }, [paso]);

  // Countdown idle en paso pago
  useEffect(() => {
    if (paso !== "pago") return;

    setTiempoSesion(TTL);
    setSesionExpirada(false);

    sesionCountdownRef.current = setInterval(() => {
      setTiempoSesion((t) => {
        if (t <= 1) {
          clearInterval(sesionCountdownRef.current!);
          sesionCountdownRef.current = null;
          setSesionExpirada(true);
          setTimeout(() => reiniciar(), 2000);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (sesionCountdownRef.current) clearInterval(sesionCountdownRef.current);
    };
  }, [paso]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling: detecta pago aprobado cada 3s
  useEffect(() => {
    if (paso !== "qr" || !orderId || pagoCobrado || qrVencido) return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/pagos/estado?orderId=${orderId}`);
        if (!res.ok) return;
        const { estado } = await res.json();
        if (estado === "aprobado") {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          clearInterval(qrCountdownRef.current!);
          qrCountdownRef.current = null;
          setPagoCobrado(true);
          setTimeout(() => reiniciar(), 3000);
        }
      } catch { /* silent */ }
    }, 3000);

    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [paso, orderId, pagoCobrado, qrVencido]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown QR: 60s
  useEffect(() => {
    if (paso !== "qr" || pagoCobrado || qrVencido) return;

    setTiempoQR(TTL);
    qrCountdownRef.current = setInterval(() => {
      setTiempoQR((t) => {
        if (t <= 1) {
          clearInterval(qrCountdownRef.current!);
          qrCountdownRef.current = null;
          if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
          setQrVencido(true);
          setTimeout(() => salirDeQR(), 2000);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => { if (qrCountdownRef.current) clearInterval(qrCountdownRef.current); };
  }, [paso, orderId]); // eslint-disable-line react-hooks/exhaustive-deps

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
        // Ya tiene sesión registrada hoy
        setSesion(dataSesion.sesion);
        setMontoPagar(String(data.balance + dataSesion.sesion.monto));
        setPaso("pago");
      } else if (dataSesion.horario_activo) {
        // Dentro de la ventana del horario → registrar asistencia automáticamente
        await registrarSesion(data, dataSesion.horario_activo);
      } else {
        // Sin horario activo ahora → ir directo a pago de deuda existente
        setMontoPagar(String(data.balance));
        setPaso("pago");
      }
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    }
    setCargando(false);
  }

  async function registrarSesion(cl: Cliente, hor: Horario) {
    try {
      const res = await fetch("/api/sesiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idcliente: cl.idcliente, idhorario: hor.idhorario, asistio: true }),
      });
      const data = await res.json();
      const nuevoBalance = Number(cl.balance) + Number(data.monto);
      setCliente({ ...cl, balance: nuevoBalance });
      setSesion({ ...data, idhorario: hor.idhorario, asistio: 1 });
      setMontoPagar(String(nuevoBalance));
      setPaso("pago");
    } catch {
      setError("Error al registrar la sesión.");
    }
  }

  async function generarQR() {
    if (!cliente || !montoPagar || Number(montoPagar) <= 0) { setError("Ingresá un monto válido."); return; }
    setCargando(true);
    setError("");
    if (sesionCountdownRef.current) { clearInterval(sesionCountdownRef.current); sesionCountdownRef.current = null; }
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (qrCountdownRef.current) { clearInterval(qrCountdownRef.current); qrCountdownRef.current = null; }
    setQrVencido(false);
    setPagoCobrado(false);
    try {
      const res = await fetch("/api/pagos/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idcliente: cliente.idcliente, monto: Number(montoPagar) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al generar el QR.");
        setTimeout(() => { setCargando(false); reiniciar(); }, 5000);
        return;
      }
      setQrPos(data.qrPos || "");
      setOrderId(data.orderId || "");
      setPaso("qr");
    } catch {
      setError("Error de conexión al generar el QR.");
      setTimeout(() => { setCargando(false); reiniciar(); }, 5000);
      return;
    }
    setCargando(false);
  }

  function reiniciar() {
    setDni("");
    setCliente(null);
    setSesion(null);
    setMontoPagar("");
    setQrPos("");
    setOrderId("");
    setPagoCobrado(false);
    setQrVencido(false);
    setTiempoQR(TTL);
    setSesionExpirada(false);
    setTiempoSesion(TTL);
    if (sesionCountdownRef.current) { clearInterval(sesionCountdownRef.current); sesionCountdownRef.current = null; }
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (qrCountdownRef.current) { clearInterval(qrCountdownRef.current); qrCountdownRef.current = null; }
    setError("");
    setPaso("dni");
  }

  function salirDeQR() {
    if (orderId && !pagoCobrado) {
      fetch("/api/pagos/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      }).catch(() => {});
    }
    reiniciar();
  }

  const sesionColor =
    tiempoSesion > 30 ? "text-gray-500" :
    tiempoSesion > 10 ? "text-yellow-400" : "text-red-400";

  const qrColor =
    tiempoQR > 30 ? "text-gray-400" :
    tiempoQR > 10 ? "text-yellow-400" : "text-red-400";

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const ExpiryScreen = () => (
    <div className="py-10 text-center space-y-4">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      <p className="text-white font-bold text-xl">Sesión expirada</p>
      <p className="text-gray-500 text-sm">Volviendo al inicio...</p>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-gray-950 flex flex-col">

      <header className="px-5 pt-10 pb-4 sm:pt-14 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">WOX Rosario</h1>
      </header>

      <main className="flex-1 flex flex-col justify-start sm:justify-center px-4 pb-8 sm:pb-0 w-full max-w-md mx-auto">
        <div className="bg-gray-900 rounded-2xl shadow-xl p-5 sm:p-6 space-y-4">

          {/* PASO 1: DNI */}
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

          {/* PASO 2: Monto */}
          {paso === "pago" && cliente && (
            sesionExpirada ? <ExpiryScreen /> : (
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide">Cliente</p>
                      <p className="text-white font-bold text-2xl mt-0.5">{cliente.nombre}</p>
                    </div>
                    <span className={`text-xs font-mono tabular-nums ${sesionColor}`}>{fmtTime(tiempoSesion)}</span>
                  </div>
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
                    onClick={() => { setMontoPagar(String(cliente.balance)); montoInputRef.current?.focus(); }}
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
            )
          )}

          {/* PASO 3: QR */}
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
                    <p className="text-gray-400 text-sm mt-1">${Number(montoPagar).toLocaleString("es-AR")} · {cliente.nombre}</p>
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
                  <p className="text-white font-bold text-xl">QR vencido</p>
                  <p className="text-gray-500 text-sm">Volviendo al inicio...</p>
                </div>

              ) : (
                <>
                  <div className="bg-gray-800 rounded-xl p-4">
                    <p className="text-gray-400 text-xs uppercase tracking-wide">Pagando</p>
                    <p className="text-white font-bold text-xl mt-0.5">{cliente.nombre}</p>
                    <p className="text-green-400 font-bold text-3xl mt-1">${Number(montoPagar).toLocaleString("es-AR")}</p>
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <p className="text-gray-400 text-sm">Escaneá con la app de Mercado Pago</p>
                    <p className={`text-sm font-mono font-semibold tabular-nums ${qrColor}`}>{fmtTime(tiempoQR)}</p>
                  </div>

                  {qrPos && (
                    <div className="flex justify-center">
                      <div className="bg-white p-3 rounded-2xl inline-block shadow-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrPos} alt="QR Mercado Pago" className="w-[240px] h-[240px] sm:w-[280px] sm:h-[280px]" />
                      </div>
                    </div>
                  )}

                  <button onClick={salirDeQR} className="w-full text-gray-500 text-sm py-3 transition-colors">
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
