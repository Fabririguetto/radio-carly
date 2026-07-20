import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

type Seccion = {
  id: string;
  titulo: string;
  icono: string;
  contenido: React.ReactNode;
};

function Bloque({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-1.5">
      {titulo && <p className="text-gray-300 text-sm font-semibold mb-2">{titulo}</p>}
      {children}
    </div>
  );
}

function Item({ label, desc }: { label: string; desc: string }) {
  return (
    <div>
      <span className="text-white text-sm font-medium">{label}</span>
      <span className="text-gray-400 text-sm"> — {desc}</span>
    </div>
  );
}

function Badge({ color, texto }: { color: "green" | "yellow" | "red" | "blue"; texto: string }) {
  const cls = {
    green:  "bg-green-600/20 text-green-400",
    yellow: "bg-yellow-600/20 text-yellow-400",
    red:    "bg-red-600/20 text-red-400",
    blue:   "bg-blue-600/20 text-blue-400",
  }[color];
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{texto}</span>;
}

export default function Ayuda() {
  const router = useRouter();
  const [abierto, setAbierto] = useState<string | null>("acceso");
  const [listo, setListo] = useState(false);

  useEffect(() => {
    fetch("/api/admin/me").then((r) => {
      if (r.status === 401) { router.replace("/admin"); return; }
      setListo(true);
    });
  }, []);

  if (!listo) return null;

  const secciones: Seccion[] = [
    {
      id: "acceso",
      titulo: "Acceso al panel",
      icono: "🔑",
      contenido: (
        <div className="space-y-3">
          <Bloque>
            <Item label="Desde la pantalla principal" desc="ingresá el DNI maestro en el campo de DNI del kiosko." />
            <Item label="Si el DNI tiene contraseña" desc="te redirige a pedir la contraseña automáticamente." />
            <Item label="Sin contraseña asignada" desc="entrás directo al panel." />
          </Bloque>
          <Bloque titulo="Navegación principal">
            <Item label="Clientes" desc="lista de todos los clientes y sus deudas." />
            <Item label="Calendario" desc="vista semanal de horarios fijos por sala." />
            <Item label="Salas" desc="crear y administrar las salas del estudio." />
            <Item label="Configuración" desc="precios y conexión con Mercado Pago." />
          </Bloque>
        </div>
      ),
    },
    {
      id: "clientes",
      titulo: "Clientes",
      icono: "👥",
      contenido: (
        <div className="space-y-3">
          <Bloque titulo="Lista de clientes">
            <Item label="Buscar" desc="escribí nombre o DNI en el buscador." />
            <Item label="Ordenar" desc="hacé click en las columnas Nombre, DNI o Deuda." />
            <Item label="Deuda en amarillo" desc="el cliente tiene saldo pendiente." />
            <Item label="Deuda en verde" desc="el cliente está al día." />
          </Bloque>
          <Bloque titulo="Crear un cliente">
            <Item label="+ Nuevo cliente" desc="desplegá el formulario, ingresá DNI y nombre completo." />
          </Bloque>
          <Bloque titulo="Detalle del cliente">
            <Item label="Cobrado" desc="total de sesiones acumuladas." />
            <Item label="Pagado" desc="total abonado vía QR." />
            <Item label="Deuda" desc="diferencia entre cobrado y pagado." />
          </Bloque>
          <Bloque titulo="Historial del cliente">
            <Item label="Últimas sesiones" desc="muestra fecha, horario y si asistió o fue reserva." />
            <Item label="Últimos pagos" desc="muestra monto y estado del pago QR." />
          </Bloque>
          <Bloque>
            <div className="flex gap-2 flex-wrap">
              <Badge color="green" texto="Asistió" />
              <span className="text-gray-400 text-sm">→ se cobró el precio por hora</span>
            </div>
            <div className="flex gap-2 flex-wrap mt-1">
              <Badge color="red" texto="Reserva" />
              <span className="text-gray-400 text-sm">→ no asistió, se cobró el precio de reserva</span>
            </div>
          </Bloque>
        </div>
      ),
    },
    {
      id: "calendario",
      titulo: "Calendario de horarios",
      icono: "📅",
      contenido: (
        <div className="space-y-3">
          <Bloque titulo="Ver horarios">
            <Item label="Vista semanal" desc="cada columna es un día, cada bloque de color es un cliente." />
            <Item label="Línea roja" desc="indica la hora actual." />
            <Item label="En mobile" desc="navegá día por día con las flechas ‹ ›." />
          </Bloque>
          <Bloque titulo="Crear un horario">
            <Item label="Botón + Agregar" desc="abre el formulario. Elegí cliente (escribí para buscar), días de la semana (podés seleccionar varios a la vez) y el horario de entrada y salida." />
            <Item label="Arrastrando en el calendario" desc="en desktop podés arrastrar para marcar el rango horario directamente sobre el día deseado." />
          </Bloque>
          <Bloque titulo="Eliminar un horario">
            <Item label="Tocá un bloque" desc="aparecen los botones Ver cliente y Borrar." />
            <Item label="Al borrar" desc="se eliminan también las sesiones históricas de ese horario." />
          </Bloque>
        </div>
      ),
    },
    {
      id: "asistencia",
      titulo: "Sistema de asistencia",
      icono: "✅",
      contenido: (
        <div className="space-y-3">
          <Bloque titulo="Cómo funciona">
            <p className="text-gray-400 text-sm">El sistema registra la asistencia automáticamente, sin que el cliente tenga que hacer nada más que ingresar su DNI.</p>
          </Bloque>
          <Bloque titulo="Al ingresar el DNI">
            <Item label="Horario activo ahora o en los próximos 15 min" desc="se registra asistencia automáticamente y se suma el precio por hora a la deuda." />
            <Item label="Sin horario activo" desc="va directo a la pantalla de pago con la deuda que tenga acumulada." />
          </Bloque>
          <Bloque titulo="No asistencias automáticas">
            <Item label="Cron horario" desc="todos los días a los :15 de cada hora, el sistema detecta los clientes cuyo horario ya terminó y no ingresaron, y les cobra el precio de reserva automáticamente." />
            <Item label="Sin intervención manual" desc="no es necesario marcar inasistencias desde el panel." />
          </Bloque>
        </div>
      ),
    },
    {
      id: "kiosko",
      titulo: "Pantalla de clientes",
      icono: "🖥️",
      contenido: (
        <div className="space-y-3">
          <Bloque titulo="Flujo del cliente">
            <Item label="1. Ingresa su DNI" desc="en la pantalla principal." />
            <Item label="2a. Tiene horario activo" desc="se registra la asistencia y pasa directo a pagar." />
            <Item label="2b. Sin horario activo" desc="pasa directo a la pantalla de pago con su deuda actual." />
            <Item label="3. Elige el monto" desc="puede pagar el total o un monto parcial." />
            <Item label="4. Escanea el QR" desc="con la app de Mercado Pago. El QR vence en 60 segundos." />
          </Bloque>
          <Bloque titulo="Notas">
            <Item label="Monto mínimo QR" desc="$15 (límite de Mercado Pago)." />
            <Item label="Si el QR vence" desc="vuelve al inicio automáticamente y la orden se cancela." />
            <Item label="Pago confirmado" desc="la deuda se actualiza automáticamente al recibir la notificación de MP." />
          </Bloque>
        </div>
      ),
    },
    {
      id: "config",
      titulo: "Configuración",
      icono: "⚙️",
      contenido: (
        <div className="space-y-3">
          <Bloque titulo="Precios">
            <Item label="Precio por hora" desc="monto que se cobra cuando el cliente asiste a su sesión." />
            <Item label="Precio de reserva" desc="monto que se cobra cuando el cliente no asiste (inasistencia automática)." />
            <Item label="Límite de deuda" desc="si la deuda del cliente supera este monto, no puede registrar sesión hasta pagar. Con 0 no hay límite." />
          </Bloque>
          <Bloque titulo="Mercado Pago">
            <Item label="Conectar" desc="completá nombre del negocio, dirección, ciudad y provincia, luego hacé click en Conectar con Mercado Pago. Se abre una página de MP para autorizar." />
            <Item label="Estado Conectado" desc="los pagos QR funcionan. Se muestra el Collector ID y la caja asociada." />
            <Item label="Reconectar" desc="si el token vence o querés cambiar de cuenta, usá el botón Reconectar Mercado Pago." />
            <Item label="Desvincular" desc="deshabilita los cobros QR hasta que vuelvas a conectar." />
          </Bloque>
        </div>
      ),
    },
    {
      id: "salas",
      titulo: "Salas",
      icono: "🏠",
      contenido: (
        <div className="space-y-3">
          <Bloque titulo="Qué son las salas">
            <p className="text-gray-400 text-sm">Cada sala es un espacio físico independiente del estudio. Los horarios de los clientes se asignan a una sala específica, lo que permite tener varios clientes al mismo horario en distintas salas sin conflicto.</p>
          </Bloque>
          <Bloque titulo="Administrar salas">
            <Item label="Nueva sala" desc="ingresá el nombre (ej: Sala A, Estudio 1) y guardá." />
            <Item label="Renombrar" desc='hacé click en "Renombrar" al lado de la sala.' />
            <Item label="Desactivar" desc="la sala deja de aparecer en el calendario y en el selector del formulario. Sus horarios existentes siguen en la base de datos." />
            <Item label="Eliminar" desc="solo se puede eliminar una sala si no tiene horarios asignados. Si los tiene, primero desactivala." />
          </Bloque>
          <Bloque titulo="Salas en el calendario">
            <Item label="Chips de filtro" desc="encima del grid aparecen los botones Todas / Sala A / Sala B (y las que hayas creado). Al elegir una sala solo se ven sus horarios." />
            <Item label="Nueva asignación" desc="al agregar un horario desde el formulario, primero elegís la sala y luego los días y horarios. El sistema verifica solapamientos dentro de la misma sala." />
          </Bloque>
          <Bloque titulo="Salas en el kiosko">
            <Item label="Sala asignada" desc='en el paso de pago se muestra "Incluye sesión de hoy: $X · Sala A" para que el cliente sepa adónde ir.' />
          </Bloque>
        </div>
      ),
    },
    {
      id: "caja",
      titulo: "Dashboard de caja",
      icono: "📊",
      contenido: (
        <div className="space-y-3">
          <Bloque titulo="Acceso">
            <Item label="Ícono de barras" desc='en la pantalla de Clientes, tocá el ícono de gráfico de barras (arriba a la derecha) para abrir el Dashboard de Caja.' />
          </Bloque>
          <Bloque titulo="Filtro de período">
            <Item label="Hoy / Semana / Mes" desc="mostrás lo cobrado y las sesiones del período seleccionado con un toque." />
            <Item label="Período personalizado" desc='elegí "Período", seleccioná fecha de inicio y fin, y presioná Aplicar.' />
          </Bloque>
          <Bloque titulo="Qué muestra">
            <Item label="Cobrado" desc="total de pagos aprobados en el período elegido." />
            <Item label="Sesiones" desc="cantidad de sesiones en el período: total, asistieron y ausentes." />
            <Item label="Deudas pendientes" desc="los 10 clientes con mayor deuda activa (no depende del período)." />
          </Bloque>
          <Bloque titulo="Exportar CSV">
            <Item label="Seleccioná el mes" desc="en la sección Exportar pagos, elegí el mes y descargá el archivo." />
            <Item label="Formato" desc="CSV con BOM, compatible con Excel y Google Sheets. Incluye fecha, cliente, DNI, monto, estado y Payment ID." />
          </Bloque>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-gray-950 px-4 py-6 pb-10">
      <div className="max-w-lg mx-auto space-y-4">

        <div className="flex items-center gap-3">
          <Link href="/admin/clientes" className="text-gray-400 text-sm py-2 pr-1">←</Link>
          <h1 className="text-white font-bold text-xl">Ayuda</h1>
        </div>

        <div className="space-y-2">
          {secciones.map((s) => {
            const isOpen = abierto === s.id;
            return (
              <div key={s.id} className="bg-gray-900 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setAbierto(isOpen ? null : s.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl">{s.icono}</span>
                    <span className="text-white font-semibold">{s.titulo}</span>
                  </span>
                  <span className={`text-gray-500 text-lg transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                    ›
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5">
                    {s.contenido}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
