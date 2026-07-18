import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function PagoExitoso() {
  const router = useRouter();
  const [segundos, setSegundos] = useState(5);

  // Fallback: procesa el pago usando payment_id + preference_id de la URL de MP
  useEffect(() => {
    if (!router.isReady) return;
    const { payment_id, preference_id } = router.query;
    if (payment_id) {
      const params = new URLSearchParams({ payment_id: String(payment_id) });
      if (preference_id) params.set("preference_id", String(preference_id));
      fetch(`/api/pagos/confirmar?${params}`).catch(() => null);
    }
  }, [router.isReady, router.query]);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setSegundos((s) => {
        if (s <= 1) {
          clearInterval(intervalo);
          router.replace("/");
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalo);
  }, [router]);

  return (
    <div className="min-h-[100dvh] bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-600/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <div>
          <h1 className="text-white font-bold text-2xl">¡Pago exitoso!</h1>
          <p className="text-gray-400 text-sm mt-2">Tu pago fue procesado correctamente.</p>
        </div>
        <p className="text-gray-500 text-sm">
          Volviendo al inicio en {segundos}s...
        </p>
        <button
          onClick={() => router.replace("/")}
          className="block w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
