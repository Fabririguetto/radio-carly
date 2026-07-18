import { useState, useEffect } from "react";
import { useRouter } from "next/router";

type Paso = "dni" | "password";

export default function AdminLogin() {
  const [paso, setPaso] = useState<Paso>("dni");
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const pendingDni = sessionStorage.getItem("adminDni");
    if (pendingDni) {
      setDni(pendingDni);
      sessionStorage.removeItem("adminDni");
      setPaso("password");
    }
  }, []);

  async function verificarDni() {
    if (!dni.trim()) return;
    setCargando(true);
    setError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dni: dni.trim(), password: "" }),
    });
    // Si el error es específicamente de contraseña, el DNI es correcto
    const data = await res.json();
    if (res.status === 401 && data.error === "Contraseña incorrecta") {
      setPaso("password");
    } else if (res.ok) {
      sessionStorage.setItem("admin", "1");
      router.push("/admin/clientes");
    } else {
      setError("DNI no autorizado.");
    }
    setCargando(false);
  }

  async function verificarPassword() {
    if (!password.trim()) return;
    setCargando(true);
    setError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dni: dni.trim(), password: password.trim() }),
    });
    if (res.ok) {
      sessionStorage.setItem("admin", "1");
      router.push("/admin/clientes");
    } else {
      setError("Contraseña incorrecta.");
      setPassword("");
    }
    setCargando(false);
  }

  function volver() {
    setPaso("dni");
    setPassword("");
    setError("");
  }

  return (
    <div className="min-h-[100dvh] bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center">
          <h1 className="text-white font-bold text-2xl">Panel Admin</h1>
          <p className="text-gray-500 text-sm mt-1">
            {paso === "dni" ? "Ingresá el DNI maestro" : "Ingresá la contraseña"}
          </p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-5 space-y-4">

          {paso === "dni" && (
            <>
              <input
                type="text"
                inputMode="numeric"
                placeholder="DNI maestro"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && verificarDni()}
                autoFocus
                className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                onClick={verificarDni}
                disabled={cargando}
                className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-colors text-lg"
              >
                {cargando ? "Verificando..." : "Continuar"}
              </button>
            </>
          )}

          {paso === "password" && (
            <>
              <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-4 py-3">
                <span className="text-gray-500 text-sm">DNI</span>
                <span className="text-white font-medium">{dni}</span>
              </div>
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && verificarPassword()}
                autoFocus
                className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                onClick={verificarPassword}
                disabled={cargando}
                className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-colors text-lg"
              >
                {cargando ? "Verificando..." : "Ingresar"}
              </button>
              <button onClick={volver} className="w-full text-gray-500 text-sm py-2">
                ← Cambiar DNI
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
