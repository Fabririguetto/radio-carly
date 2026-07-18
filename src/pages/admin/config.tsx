import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

interface MpEstado {
  configurado: boolean;
  nombre_negocio: string;
  mp_collector_id: string;
  mp_pos_external_id: string;
  mp_token_hint: string | null;
  mp_token_expires_at: string | null;
  direccion: string;
  ciudad: string;
  provincia: string;
}

const MP_ERROR_MSG: Record<string, string> = {
  denied:    "Cancelaste la autorización en Mercado Pago.",
  token:     "Error al intercambiar el código con Mercado Pago.",
  test_user: "Usá credenciales de producción, no de prueba.",
  store:     "Error al crear la sucursal en Mercado Pago.",
  pos:       "Error al crear la caja en Mercado Pago.",
  unknown:   "Error inesperado. Revisá los logs de Railway.",
};

export default function AdminConfig() {
  const router = useRouter();

  // Precios
  const [precioHora, setPrecioHora] = useState("");
  const [precioReserva, setPrecioReserva] = useState("");
  const [exitoPrecios, setExitoPrecios] = useState("");
  const [errorPrecios, setErrorPrecios] = useState("");

  // Mercado Pago
  const [mpEstado, setMpEstado] = useState<MpEstado | null>(null);
  const [mpNegocio, setMpNegocio] = useState("");
  const [mpDireccion, setMpDireccion] = useState("");
  const [mpCiudad, setMpCiudad] = useState("");
  const [mpProvincia, setMpProvincia] = useState("");
  const [mpCargando, setMpCargando] = useState(false);
  const [mpDesvinculando, setMpDesvinculando] = useState(false);
  const [mpGuardando, setMpGuardando] = useState(false);
  const [exitoMp, setExitoMp] = useState("");
  const [errorMp, setErrorMp] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("admin") !== "1") { router.replace("/"); return; }

    fetch("/api/admin/config").then((r) => r.json()).then((d) => {
      setPrecioHora(String(d.precio_hora));
      setPrecioReserva(String(d.precio_reserva));
    });

    cargarEstadoMp();

    // Resultado del OAuth redirect
    const { mp, reason } = router.query;
    if (mp === "ok") {
      setExitoMp("Mercado Pago conectado correctamente.");
      router.replace("/admin/config", undefined, { shallow: true });
    } else if (mp === "error") {
      setErrorMp(MP_ERROR_MSG[String(reason)] ?? "Error al conectar con Mercado Pago.");
      router.replace("/admin/config", undefined, { shallow: true });
    }
  }, [router.query]);

  function cargarEstadoMp() {
    fetch("/api/admin/mp-config").then((r) => r.json()).then((d: MpEstado) => {
      setMpEstado(d);
      if (d.nombre_negocio) setMpNegocio(d.nombre_negocio);
      if (d.direccion) setMpDireccion(d.direccion);
      if (d.ciudad) setMpCiudad(d.ciudad);
      if (d.provincia) setMpProvincia(d.provincia);
    });
  }

  async function guardarPrecios() {
    setErrorPrecios(""); setExitoPrecios("");
    if (!precioHora || !precioReserva || Number(precioHora) <= 0 || Number(precioReserva) <= 0) {
      setErrorPrecios("Ingresá precios válidos.");
      return;
    }
    const res = await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ precio_hora: Number(precioHora), precio_reserva: Number(precioReserva) }),
    });
    if (res.ok) setExitoPrecios("Precios actualizados correctamente.");
    else setErrorPrecios("Error al guardar.");
  }

  async function desvincularMp() {
    if (!confirm("¿Desvinculás Mercado Pago? Los pagos QR dejarán de funcionar hasta que vuelvas a conectar.")) return;
    setMpDesvinculando(true);
    setErrorMp(""); setExitoMp("");
    try {
      const res = await fetch("/api/admin/mp-config", { method: "DELETE" });
      if (res.ok) {
        setExitoMp("Mercado Pago desvinculado.");
        cargarEstadoMp();
      } else {
        setErrorMp("Error al desvincular.");
      }
    } catch {
      setErrorMp("Error de red.");
    } finally {
      setMpDesvinculando(false);
    }
  }

  async function guardarDatosNegocio() {
    setErrorMp(""); setExitoMp("");
    setMpGuardando(true);
    try {
      const res = await fetch("/api/admin/mp-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_negocio: mpNegocio.trim(),
          direccion: mpDireccion.trim(),
          ciudad: mpCiudad.trim(),
          provincia: mpProvincia.trim(),
        }),
      });
      if (res.ok) setExitoMp("Datos del negocio guardados.");
      else setErrorMp("Error al guardar.");
    } catch {
      setErrorMp("Error de red.");
    } finally {
      setMpGuardando(false);
    }
  }

  async function conectarMp() {
    setErrorMp(""); setExitoMp("");
    if (!mpNegocio.trim() || !mpDireccion.trim() || !mpCiudad.trim() || !mpProvincia.trim()) {
      setErrorMp("Completá nombre, dirección, ciudad y provincia antes de conectar.");
      return;
    }
    setMpCargando(true);
    try {
      const res = await fetch("/api/admin/mp-oauth-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_negocio: mpNegocio.trim(),
          direccion: mpDireccion.trim(),
          ciudad: mpCiudad.trim(),
          provincia: mpProvincia.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMp(data.error ?? "Error al iniciar la conexión.");
        setMpCargando(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setErrorMp("Error de red. Intentá de nuevo.");
      setMpCargando(false);
    }
  }

  const tokenExpira = mpEstado?.mp_token_expires_at
    ? new Date(mpEstado.mp_token_expires_at).toLocaleDateString("es-AR")
    : null;

  return (
    <div className="min-h-[100dvh] bg-gray-950 px-4 py-6">
      <div className="max-w-sm mx-auto space-y-6">

        <div className="flex items-center gap-3">
          <Link href="/admin/clientes" className="text-gray-400 text-sm py-2 pr-2">← Volver</Link>
          <h1 className="text-white font-bold text-xl">Configuración</h1>
        </div>

        {/* Precios */}
        <div className="bg-gray-900 rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-base">Precios</h2>
          <div className="space-y-1.5">
            <label className="text-gray-400 text-sm">Precio por hora ($)</label>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={precioHora}
              onChange={(e) => setPrecioHora(e.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-gray-400 text-sm">Precio reserva — no asistencia ($)</label>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={precioReserva}
              onChange={(e) => setPrecioReserva(e.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {errorPrecios && <p className="text-red-400 text-sm">{errorPrecios}</p>}
          {exitoPrecios && <p className="text-green-400 text-sm">{exitoPrecios}</p>}
          <button
            onClick={guardarPrecios}
            className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-colors text-lg"
          >
            Guardar precios
          </button>
        </div>

        {/* Mercado Pago */}
        <div className="bg-gray-900 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-base">Mercado Pago</h2>
            {mpEstado && (
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                mpEstado.configurado ? "bg-green-900 text-green-400" : "bg-yellow-900 text-yellow-400"
              }`}>
                {mpEstado.configurado ? "Conectado" : "Sin conectar"}
              </span>
            )}
          </div>

          {mpEstado?.configurado && (
            <div className="bg-gray-800 rounded-xl px-4 py-3 space-y-1 text-sm">
              <p className="text-gray-400">
                Negocio: <span className="text-white">{mpEstado.nombre_negocio}</span>
              </p>
              {mpEstado.direccion && (
                <p className="text-gray-400">
                  Dirección: <span className="text-white">{mpEstado.direccion}, {mpEstado.ciudad}, {mpEstado.provincia}</span>
                </p>
              )}
              <p className="text-gray-400">
                Collector ID: <span className="text-white">{mpEstado.mp_collector_id}</span>
              </p>
              <p className="text-gray-400">
                POS: <span className="text-white">{mpEstado.mp_pos_external_id}</span>
              </p>
              {tokenExpira && (
                <p className="text-gray-400">
                  Token vence: <span className="text-white">{tokenExpira}</span>
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-gray-400 text-sm">Nombre del negocio</label>
            <input
              type="text"
              value={mpNegocio}
              onChange={(e) => setMpNegocio(e.target.value)}
              placeholder="Ej: Radio Carly"
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-gray-400 text-sm">Dirección</label>
            <input
              type="text"
              value={mpDireccion}
              onChange={(e) => setMpDireccion(e.target.value)}
              placeholder="Ej: San Martín 1234"
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-gray-400 text-sm">Ciudad</label>
              <input
                type="text"
                value={mpCiudad}
                onChange={(e) => setMpCiudad(e.target.value)}
                placeholder="Ej: Rosario"
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-gray-400 text-sm">Provincia</label>
              <input
                type="text"
                value={mpProvincia}
                onChange={(e) => setMpProvincia(e.target.value)}
                placeholder="Ej: Santa Fe"
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {errorMp && <p className="text-red-400 text-sm">{errorMp}</p>}
          {exitoMp && <p className="text-green-400 text-sm">{exitoMp}</p>}

          <button
            onClick={guardarDatosNegocio}
            disabled={mpGuardando || mpCargando || mpDesvinculando}
            className="w-full bg-gray-700 hover:bg-gray-600 active:bg-gray-800 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors text-sm"
          >
            {mpGuardando ? "Guardando..." : "Guardar datos del negocio"}
          </button>

          <button
            onClick={conectarMp}
            disabled={mpCargando || mpDesvinculando}
            className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-colors text-base"
          >
            {mpCargando
              ? "Redirigiendo..."
              : mpEstado?.configurado
                ? "Reconectar Mercado Pago"
                : "Conectar con Mercado Pago"}
          </button>

          {mpEstado?.configurado && (
            <button
              onClick={desvincularMp}
              disabled={mpDesvinculando || mpCargando}
              className="w-full bg-transparent hover:bg-red-950 active:bg-red-900 disabled:opacity-50 text-red-400 font-medium py-3 rounded-xl transition-colors text-sm border border-red-900"
            >
              {mpDesvinculando ? "Desvinculando..." : "Desvincular Mercado Pago"}
            </button>
          )}
          <p className="text-gray-500 text-xs text-center">
            Serás redirigido a Mercado Pago para autorizar la conexión
          </p>
        </div>

      </div>
    </div>
  );
}
