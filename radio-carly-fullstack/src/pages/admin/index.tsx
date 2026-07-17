import { useState } from "react";
import { useRouter } from "next/router";

export default function AdminLogin() {
  const [dni, setDni] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  async function ingresar() {
    if (!dni.trim()) return;
    setCargando(true);
    setError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dni: dni.trim() }),
    });
    if (res.ok) {
      sessionStorage.setItem("admin", "1");
      router.push("/admin/clientes");
    } else {
      setError("DNI no autorizado.");
    }
    setCargando(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl shadow-xl p-6 space-y-4">
        <h1 className="text-white font-bold text-xl">Panel Administrador</h1>
        <input
          type="text"
          inputMode="numeric"
          placeholder="DNI maestro"
          value={dni}
          onChange={(e) => setDni(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ingresar()}
          className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          onClick={ingresar}
          disabled={cargando}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {cargando ? "Verificando..." : "Ingresar"}
        </button>
      </div>
    </div>
  );
}
