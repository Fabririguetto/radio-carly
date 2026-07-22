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
  idprograma_horario: number;
  asistio: number | null;
  monto: number;
  hora_inicio: string;
  hora_fin: string;
  estudio_nombre?: string | null;
};


type Paso = "dni" | "notif" | "horarios" | "pago" | "qr" | "mp_result";

type HorarioConSesion = {
  idprograma_horario: number;
  hora_inicio: string;
  hora_fin: string;
  estudio_nombre: string | null;
  programa_nombre: string | null;
  sesion: { idsesion: number; asistio: number; monto: number } | null;
};


type NotifActiva = {
  idnotificacion: number;
  titulo: string;
  texto: string;
  tipo: "general" | "aumento_cuota";
  precio_nuevo: number | null;
};

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
  const [ticketData, setTicketData] = useState<{ idpago: number; monto: number; negocio: string } | null>(null);

  const [tiempoSesion, setTiempoSesion] = useState(TTL);
  const [sesionExpirada, setSesionExpirada] = useState(false);
  const sesionCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [tiempoQR, setTiempoQR] = useState(TTL);
  const [qrVencido, setQrVencido] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pagoCobradoRef = useRef(false);

  const [notifActiva, setNotifActiva] = useState<NotifActiva | null>(null);
  const [horariosHoy, setHorariosHoy] = useState<HorarioConSesion[]>([]);

  const [totalDebido, setTotalDebido] = useState(0);
  const [negocio, setNegocio] = useState("Estudio");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mpResult, setMpResult] = useState<"ok" | "error" | "pendiente" | null>(null);

  const pendingContinuationRef = useRef<(() => Promise<void>) | null>(null);
  const montoInputRef = useRef<HTMLInputElement>(null);

  // Nombre del negocio desde config
  useEffect(() => {
    fetch("/api/config-publica").then(r => r.json()).then(d => {
      if (d.nombre_negocio) setNegocio(d.nombre_negocio);
    }).catch(() => {});
  }, []);

  // Enter en paso notif
  useEffect(() => {
    if (paso !== "notif") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" && !cargando) aceptarNotif();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paso, cargando]); // eslint-disable-line react-hooks/exhaustive-deps

  // Teclado numérico en paso horarios: 1..N selecciona horario
  useEffect(() => {
    if (paso !== "horarios") return;
    function onKey(e: KeyboardEvent) {
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= horariosHoy.length) {
        const h = horariosHoy[num - 1];
        if (!h.sesion && !cargando) seleccionarHorario(h);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paso, horariosHoy, cargando]); // eslint-disable-line react-hooks/exhaustive-deps

  // Manejar retorno de MP Checkout Pro (?pago=ok|error|pendiente)
  useEffect(() => {
    const { pago } = router.query;
    if (!pago) return;
    if (pago === "ok" || pago === "error" || pago === "pendiente") {
      setMpResult(pago as "ok" | "error" | "pendiente");
      setPaso("mp_result");
      router.replace("/", undefined, { shallow: true });
      if (pago === "ok") setTimeout(() => reiniciar(), 4000);
    }
  }, [router.query]); // eslint-disable-line react-hooks/exhaustive-deps


  // Foco automático en input de monto al entrar al paso pago (para numpad físico)
  useEffect(() => {
    if (paso === "pago" && totalDebido > 0) {
      setTimeout(() => montoInputRef.current?.focus(), 50);
    }
  }, [paso, totalDebido]);

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

  // Polling: detecta pago aprobado cada 3s.
  // Se mantiene activo hasta que el pago se detecte o reiniciar() lo limpie,
  // lo que permite un período de gracia tras el vencimiento del QR.
  useEffect(() => {
    if (paso !== "qr" || !orderId) return;

    pollingRef.current = setInterval(async () => {
      if (pagoCobradoRef.current) return;
      try {
        const res = await fetch(`/api/pagos/estado?orderId=${orderId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.estado === "aprobado") {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          clearInterval(qrCountdownRef.current!);
          qrCountdownRef.current = null;
          if (data.ticket) setTicketData(data.ticket);
          pagoCobradoRef.current = true;
          setPagoCobrado(true);
          setTimeout(() => window.print(), 200);
          setTimeout(() => reiniciar(), 3000);
        }
      } catch { /* silent */ }
    }, 3000);

    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [paso, orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown QR: 60s
  useEffect(() => {
    if (paso !== "qr" || pagoCobrado || qrVencido) return;

    setTiempoQR(TTL);
    qrCountdownRef.current = setInterval(() => {
      setTiempoQR((t) => {
        if (t <= 1) {
          clearInterval(qrCountdownRef.current!);
          qrCountdownRef.current = null;
          // El polling sigue activo 2s más (período de gracia) por si el pago
          // fue escaneado en el último segundo. salirDeQR → reiniciar lo limpia.
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

      // Verificar notificaciones pendientes antes de continuar
      try {
        const notifRes = await fetch(`/api/notificaciones/pendiente?idcliente=${data.idcliente}`);
        const notifData = await notifRes.json();
        if (notifData.notif) {
          setNotifActiva(notifData.notif);
          pendingContinuationRef.current = () => continuarFlujo(data);
          setCargando(false);
          setPaso("notif");
          return;
        }
      } catch { /* si falla la notif, continúa el flujo normal */ }

      await continuarFlujo(data);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    }
    setCargando(false);
  }

  function isHorarioActivo(horaInicio: string, horaFin: string): boolean {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const parse = (t: string) => { const p = String(t).split(":"); return Number(p[0]) * 60 + Number(p[1]); };
    return nowMins >= parse(horaInicio) - 15 && nowMins < parse(horaFin);
  }

  async function continuarFlujo(data: Cliente) {
    const resSesion = await fetch(`/api/sesiones/hoy?idcliente=${data.idcliente}`);
    const dataSesion = await resSesion.json();
    const horarios: HorarioConSesion[] = dataSesion.horarios ?? [];

    if (horarios.length === 0) {
      setTotalDebido(data.balance);
      setMontoPagar(data.balance > 0 ? String(data.balance) : "");
      setCargando(false);
      setPaso("pago");
      return;
    }

    setHorariosHoy(horarios);

    const pendientes = horarios.filter((h) => h.sesion === null);
    if (pendientes.length === 0) {
      setTotalDebido(data.balance);
      setMontoPagar(data.balance > 0 ? String(data.balance) : "");
      setCargando(false);
      setPaso("pago");
      return;
    }

    // Si hay exactamente un horario activo ahora (ventana de 15 min antes hasta fin),
    // registrar asistencia automáticamente sin pasar por la pantalla de selección.
    const activos = pendientes.filter((h) => isHorarioActivo(h.hora_inicio, h.hora_fin));
    if (activos.length === 1) {
      const h = activos[0];
      try {
        const res = await fetch("/api/sesiones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idcliente: data.idcliente, idprograma_horario: h.idprograma_horario, asistio: true }),
        });
        if (res.status === 403) {
          const errData = await res.json();
          setError(errData.mensaje ?? "Deuda excedida.");
          setTotalDebido(data.balance);
          setMontoPagar(data.balance > 0 ? String(data.balance) : "");
          setCargando(false);
          setPaso("pago");
          return;
        }
        if (res.status === 409) {
          // Ya registrada por otra vía → ir a pago con saldo actual
          setTotalDebido(data.balance);
          setMontoPagar(data.balance > 0 ? String(data.balance) : "");
          setCargando(false);
          setPaso("pago");
          return;
        }
        const sesData = await res.json();
        const nuevoBalance = data.balance + sesData.monto;
        setCliente({ ...data, balance: nuevoBalance });
        setSesion({
          idsesion: 0,
          idprograma_horario: h.idprograma_horario,
          asistio: 1,
          monto: sesData.monto,
          hora_inicio: h.hora_inicio,
          hora_fin: h.hora_fin,
          estudio_nombre: h.estudio_nombre,
        });
        setTotalDebido(nuevoBalance);
        setMontoPagar(nuevoBalance > 0 ? String(nuevoBalance) : "");
        setCargando(false);
        setPaso("pago");
      } catch {
        setError("Error al registrar la asistencia.");
        setCargando(false);
      }
      return;
    }

    setCargando(false);
    setPaso("horarios");
  }

  async function seleccionarHorario(h: HorarioConSesion) {
    if (!cliente || h.sesion !== null || cargando) return;
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/sesiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idcliente: cliente.idcliente, idprograma_horario: h.idprograma_horario, asistio: true }),
      });

      if (res.status === 409) {
        // Ya registrada por otra vía — refrescar lista
        const resSesion = await fetch(`/api/sesiones/hoy?idcliente=${cliente.idcliente}`);
        const d = await resSesion.json();
        setHorariosHoy(d.horarios ?? []);
        setCargando(false);
        return;
      }

      if (res.status === 403) {
        const data = await res.json();
        setError(data.mensaje ?? "Deuda excedida. Pagá el saldo pendiente.");
        const bal = Number(cliente.balance);
        setTotalDebido(bal);
        setMontoPagar(bal > 0 ? String(bal) : "");
        setCargando(false);
        setPaso("pago");
        return;
      }

      const data = await res.json();
      const nuevoBalance = Number(cliente.balance) + Number(data.monto);
      setCliente({ ...cliente, balance: nuevoBalance });
      setSesion({
        idsesion: 0,
        idprograma_horario: h.idprograma_horario,
        asistio: 1,
        monto: data.monto,
        hora_inicio: h.hora_inicio,
        hora_fin: h.hora_fin,
        estudio_nombre: h.estudio_nombre,
      });
      setTotalDebido(nuevoBalance);
      setMontoPagar(nuevoBalance > 0 ? String(nuevoBalance) : "");
      setPaso("pago");
    } catch {
      setError("Error al registrar la asistencia.");
    }
    setCargando(false);
  }

  async function aceptarNotif() {
    if (!notifActiva || !cliente) return;
    try {
      await fetch("/api/notificaciones/pendiente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idnotificacion: notifActiva.idnotificacion, idcliente: cliente.idcliente }),
      });
    } catch { /* si falla el mark, igual continuamos */ }
    setNotifActiva(null);
    if (pendingContinuationRef.current) {
      setCargando(true);
      const fn = pendingContinuationRef.current;
      pendingContinuationRef.current = null;
      await fn();
      setCargando(false);
    }
  }

  async function generarQRPara(idcliente: number, monto: number) {
    if (monto <= 0) return;
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
        body: JSON.stringify({ idcliente, monto }),
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

  async function generarQR() {
    const monto = montoPagar ? Number(montoPagar) : totalDebido;
    if (!cliente || monto <= 0) { setError("Ingresá un monto válido."); return; }
    await generarQRPara(cliente.idcliente, monto);
  }

  async function pagarConMP() {
    const monto = montoPagar ? Number(montoPagar) : totalDebido;
    if (!cliente || monto <= 0) { setError("Ingresá un monto válido."); return; }
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/pagos/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idcliente: cliente.idcliente, monto }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al generar el link de pago.");
        setCargando(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
      setCargando(false);
    }
  }

  function reiniciar() {
    setNotifActiva(null);
    pendingContinuationRef.current = null;
    setDni("");
    setCliente(null);
    setSesion(null);
    setMontoPagar("");
    setTicketData(null);
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
    pagoCobradoRef.current = false;
    setHorariosHoy([]);
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
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{negocio}</h1>
      </header>

      <main className="flex-1 flex flex-col justify-start sm:justify-center px-4 pb-8 sm:pb-0 w-full max-w-md mx-auto">
        <div className="bg-gray-900 rounded-2xl shadow-xl p-5 sm:p-6 space-y-4">

          {/* PASO 1: DNI */}
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
                disabled={cargando || !dni}
                className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-colors text-lg"
              >
                {cargando ? "Buscando..." : "Continuar"}
              </button>
            </div>
          )}

          {/* PASO NOTIF: Notificación pendiente */}
          {paso === "notif" && cliente && notifActiva && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center ${notifActiva.tipo === "aumento_cuota" ? "bg-orange-500/20" : "bg-blue-500/20"}`}>
                    {notifActiva.tipo === "aumento_cuota" ? (
                      <svg className="w-7 h-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    ) : (
                      <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    )}
                  </div>
                </div>
                <p className="text-white font-bold text-xl">{notifActiva.titulo}</p>
              </div>

              <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                <p className="text-gray-300 text-sm leading-relaxed">
                  Estimado/a <span className="text-white font-semibold">{cliente.nombre}</span>, {notifActiva.texto}
                </p>
                {notifActiva.tipo === "aumento_cuota" && notifActiva.precio_nuevo && (
                  <div className="border-t border-gray-700 pt-3">
                    <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Nuevo precio por hora</p>
                    <p className="text-orange-400 font-bold text-2xl">
                      ${Number(notifActiva.precio_nuevo).toLocaleString("es-AR")}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={aceptarNotif}
                disabled={cargando}
                className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-colors text-lg"
              >
                {cargando ? "Cargando..." : "Aceptar y continuar"}
              </button>
              <button onClick={reiniciar} className="w-full text-gray-500 text-sm py-2 transition-colors">
                ← Volver
              </button>
            </div>
          )}

          {/* PASO HORARIOS: selección de sesión del día */}
          {paso === "horarios" && cliente && (
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide">Cliente</p>
                <p className="text-white font-bold text-2xl mt-0.5">{cliente.nombre}</p>
                <p className="text-gray-500 text-sm mt-1">Presioná el número para marcar asistencia</p>
              </div>

              <div className="space-y-2">
                {horariosHoy.map((h, i) => {
                  const yaRegistrado = h.sesion !== null;
                  const asistio = h.sesion?.asistio;
                  return (
                    <button
                      key={h.idprograma_horario}
                      onClick={() => seleccionarHorario(h)}
                      disabled={yaRegistrado || cargando}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-colors text-left
                        ${yaRegistrado
                          ? "bg-gray-800/50 border-gray-700 cursor-default"
                          : "bg-gray-800 border-gray-600 hover:border-blue-500 active:bg-gray-700 cursor-pointer"
                        }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0
                        ${!yaRegistrado
                          ? "bg-blue-600 text-white"
                          : asistio === 1
                            ? "bg-green-600/20 text-green-400"
                            : "bg-gray-600/20 text-gray-500"
                        }`}>
                        {yaRegistrado ? (asistio === 1 ? "✓" : "✗") : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${yaRegistrado ? "text-gray-400" : "text-white"}`}>
                          {String(h.hora_inicio).slice(0, 5)} – {String(h.hora_fin).slice(0, 5)}
                        </p>
                        {h.estudio_nombre && (
                          <p className="text-gray-500 text-xs mt-0.5">{h.estudio_nombre}</p>
                        )}
                      </div>
                      {yaRegistrado && (
                        <span className={`text-xs shrink-0 ${asistio === 1 ? "text-green-400" : "text-gray-500"}`}>
                          {asistio === 1
                            ? `Asistió · $${h.sesion!.monto.toLocaleString("es-AR")}`
                            : "No asistió"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
              {cargando && <p className="text-gray-400 text-sm text-center">Registrando asistencia...</p>}

              <button onClick={reiniciar} className="w-full text-gray-500 text-sm py-3 transition-colors">
                ← Volver
              </button>
            </div>
          )}

          {/* PASO 2: Sin deuda / o monto manual */}
          {paso === "pago" && cliente && (
            sesionExpirada ? <ExpiryScreen /> :
            totalDebido <= 0 ? (
              <div className="py-8 space-y-4 text-center">
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-green-600/20 flex items-center justify-center">
                    <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-white font-bold text-2xl">{cliente.nombre}</p>
                  <p className="text-green-400 font-semibold mt-1">¡Estás al día!</p>
                  <p className="text-gray-500 text-sm mt-1">No tenés deuda pendiente.</p>
                </div>
                <button onClick={reiniciar} className="text-gray-500 text-sm py-3">← Volver</button>
              </div>
            ) : (
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
                      ${totalDebido.toLocaleString("es-AR")}
                    </p>
                    {sesion && (
                      <p className="text-gray-500 text-xs mt-1">
                        Incluye sesión de hoy: ${Number(sesion.monto).toLocaleString("es-AR")}
                        {sesion.asistio === 0 ? " (reserva)" : ""}
                        {sesion.estudio_nombre ? ` · ${sesion.estudio_nombre}` : ""}
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
                    onKeyDown={(e) => { if (e.key === "Enter" && !cargando && Number(montoPagar) > 0) generarQR(); }}
                    className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-4 text-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setMontoPagar(String(totalDebido))}
                    className="text-blue-400 text-sm py-1"
                  >
                    Pagar total (${totalDebido.toLocaleString("es-AR")})
                  </button>
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                {/* Solo visible en mobile (< 640px) */}
                <button
                  onClick={pagarConMP}
                  disabled={cargando || !montoPagar || Number(montoPagar) <= 0}
                  className="sm:hidden w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors text-lg flex items-center justify-center gap-2"
                >
                  {cargando ? "Redirigiendo..." : (
                    <>
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.65 3C7.41 3 4 6.41 4 10.65c0 3.07 1.78 5.74 4.37 7.05L11.65 21l3.28-3.3C17.52 16.39 19.3 13.72 19.3 10.65 19.3 6.41 15.89 3 11.65 3zm0 2c2.57 0 4.65 2.08 4.65 4.65S14.22 14.3 11.65 14.3 7 12.22 7 9.65 9.08 5 11.65 5z"/>
                      </svg>
                      Pagar con Mercado Pago
                    </>
                  )}
                </button>

                <button
                  onClick={generarQR}
                  disabled={cargando || !montoPagar || Number(montoPagar) <= 0}
                  className="w-full disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors text-lg bg-gray-700 sm:bg-blue-600 hover:bg-gray-600 sm:hover:bg-blue-500 active:bg-gray-800 sm:active:bg-blue-700"
                >
                  <span className="block">{cargando ? "Generando QR..." : "Generar QR de pago"}</span>
                  {!cargando && <span className="hidden sm:block text-blue-300 text-xs font-normal mt-0.5">Enter</span>}
                </button>
                <button onClick={reiniciar} className="w-full text-gray-500 text-sm py-3 transition-colors">
                  ← Volver
                </button>
              </div>
            )
          )}

          {/* PASO MP_RESULT: retorno de Checkout Pro */}
          {paso === "mp_result" && (
            <div className="py-10 text-center space-y-4">
              {mpResult === "ok" ? (
                <>
                  <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-green-600/20 flex items-center justify-center">
                      <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-white font-bold text-2xl">¡Pago recibido!</p>
                  <p className="text-gray-500 text-sm">Volviendo al inicio...</p>
                </>
              ) : mpResult === "pendiente" ? (
                <>
                  <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-yellow-600/20 flex items-center justify-center">
                      <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-white font-bold text-xl">Pago pendiente</p>
                  <p className="text-gray-400 text-sm">Mercado Pago está procesando el pago. Te llegará una confirmación.</p>
                  <button onClick={reiniciar} className="text-gray-500 text-sm py-3">← Volver al inicio</button>
                </>
              ) : (
                <>
                  <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-red-600/20 flex items-center justify-center">
                      <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-white font-bold text-xl">Pago cancelado</p>
                  <p className="text-gray-400 text-sm">El pago fue cancelado o rechazado.</p>
                  <button onClick={reiniciar} className="text-gray-500 text-sm py-3">← Volver al inicio</button>
                </>
              )}
            </div>
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

      {/* Ticket de impresión — solo visible al imprimir */}
      {ticketData && cliente && (
        <div id="ticket-print" className="hidden">
          <div style={{ maxWidth: "80mm", margin: "0 auto", fontFamily: "monospace", fontSize: "12px", color: "#000" }}>
            <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "16px", marginBottom: "8px" }}>
              {ticketData.negocio}
            </div>
            <div style={{ borderTop: "1px solid #000", margin: "8px 0" }} />
            <div style={{ marginBottom: "4px" }}>Cliente: {cliente.nombre}</div>
            <div style={{ marginBottom: "4px" }}>DNI: {cliente.dni}</div>
            <div style={{ borderTop: "1px solid #000", margin: "8px 0" }} />
            <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "20px", margin: "8px 0" }}>
              ${Number(ticketData.monto).toLocaleString("es-AR")}
            </div>
            <div style={{ textAlign: "center", marginBottom: "4px" }}>
              {new Date().toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
            <div style={{ textAlign: "center", color: "#666" }}>Comprobante #{ticketData.idpago}</div>
            <div style={{ borderTop: "1px solid #000", margin: "8px 0" }} />
            <div style={{ textAlign: "center" }}>¡Gracias!</div>
          </div>
        </div>
      )}
    </div>
  );
}
