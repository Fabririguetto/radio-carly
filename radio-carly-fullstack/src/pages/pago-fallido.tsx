import Link from "next/link";

export default function PagoFallido() {
  return (
    <div className="min-h-[100dvh] bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-red-600/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
        <div>
          <h1 className="text-white font-bold text-2xl">Pago no completado</h1>
          <p className="text-gray-400 text-sm mt-2">Hubo un problema con el pago. Podés intentarlo de nuevo.</p>
        </div>
        <Link
          href="/"
          className="block w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
