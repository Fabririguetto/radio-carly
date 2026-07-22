import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import AdminNav from "@/components/AdminNav";

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

function Badge({ color, texto }: { color: "green" | "yellow" | "red" | "blue" | "orange" | "gray"; texto: string }) {
  const cls = {
    green:  "bg-green-600/20 text-green-400",
    yellow: "bg-yellow-600/20 text-yellow-400",
    red:    "bg-red-600/20 text-red-400",
    blue:   "bg-blue-600/20 text-blue-400",
    orange: "bg-orange-600/20 text-orange-400",
    gray:   "bg-gray-700 text-gray-300",
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
          <Bloque titulo="Navegación">
            <Item label="Menú lateral (desktop)" desc="siempre visible a la izquierda con todas las secciones." />
            <Item label="Menú hamburguesa (mobile)" desc="tocá el ícono arriba a la izquierda para abrirlo." />
            <Item label="Secciones disponibles" desc="Clientes, Calendario, Estudios, Programas, Caja, Estadísticas, Notificaciones, Configuración, Ayuda." />
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
            <Item label="Ordenar" desc="tocá las columnas Nombre, DNI o Deuda." />
            <Item label="Deuda en amarillo" desc="el cliente tiene saldo pendiente." />
            <Item label="Deuda en verde" desc="el cliente está al día." />
          </Bloque>
          <Bloque titulo="Crear un cliente">
            <Item label="+ Nuevo cliente" desc="desplegá el formulario, ingresá DNI y nombre completo." />
          </Bloque>
          <Bloque titulo="Detalle del cliente (tabs)">
            <Item label="Resumen" desc="horarios fijos asignados, bonificación y estado de cuenta." />
            <Item label="Sesiones" desc="historial de sesiones: fecha, horario, si asistió o fue reserva." />
            <Item label="Pagos" desc="historial de pagos: monto, tipo y estado." />
            <Item label="Precios" desc="precio individual vigente, precio futuro si tiene un aumento programado, e historial de precios." />
          </Bloque>
          <Bloque titulo="Bonificación">
            <Item label="Qué es" desc="crédito que se le aplica al cliente sin que haya un pago real. Reduce la deuda pero no cuenta como ingreso en Caja ni Estadísticas." />
            <Item label="Cómo hacerla" desc='en el tab Resumen del cliente, tocá "Aplicar bonificación", ingresá el monto y el motivo.' />
          </Bloque>
          <Bloque titulo="Precios individuales">
            <Item label="Precio vigente" desc="si el cliente tiene precio propio, se usa ese; si no, se usa el precio global de Configuración." />
            <Item label="Actualizar precio" desc='en el tab Precios, tocá "Actualizar precio" para asignar un nuevo valor a partir de una fecha.' />
            <Item label="Precio futuro" desc="si hay un aumento programado para adelante, aparece un aviso con la fecha de vigencia." />
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
            <Item label="Filtro por estudio" desc="chips arriba del grid para ver solo los horarios de un estudio." />
            <Item label="En mobile" desc="navegá día por día con las flechas ‹ ›." />
          </Bloque>
          <Bloque titulo="Crear un horario">
            <Item label="Botón + Agregar" desc="abre el formulario. Elegí cliente (escribí para buscar), estudio, días de la semana (podés seleccionar varios a la vez) y horario de entrada y salida." />
            <Item label="Arrastrando en el calendario" desc="en desktop podés arrastrar para marcar el rango horario directamente sobre el día. Snappea cada 15 minutos." />
          </Bloque>
          <Bloque titulo="Eliminar un horario">
            <Item label="Tocá un bloque" desc="aparecen los botones Ver cliente y Borrar." />
            <Item label="Al borrar" desc="se eliminan también las sesiones históricas de ese horario." />
          </Bloque>
        </div>
      ),
    },
    {
      id: "estudios",
      titulo: "Estudios",
      icono: "🏠",
      contenido: (
        <div className="space-y-3">
          <Bloque titulo="Qué son los estudios">
            <p className="text-gray-400 text-sm">Cada estudio es un espacio físico independiente. Los horarios se asignan a un estudio específico, lo que permite tener varios clientes al mismo horario en distintos estudios sin conflicto.</p>
          </Bloque>
          <Bloque titulo="Administrar estudios">
            <Item label="Nuevo estudio" desc="ingresá el nombre (ej: Estudio A, Estudio 1) y guardá." />
            <Item label="Renombrar" desc='tocá "Renombrar" al lado del estudio.' />
            <Item label="Desactivar" desc="el estudio deja de aparecer en el calendario y en el selector de formularios. Sus horarios existentes quedan en la base de datos." />
            <Item label="Eliminar" desc="solo se puede eliminar si no tiene horarios asignados. Si los tiene, primero desactivalo." />
          </Bloque>
          <Bloque titulo="En el calendario">
            <Item label="Chips de filtro" desc="Todas / Estudio A / Estudio B. Al elegir uno solo se ven sus horarios." />
            <Item label="Nueva asignación" desc="al agregar un horario primero elegís el estudio. El sistema verifica solapamientos dentro del mismo estudio." />
          </Bloque>
          <Bloque titulo="En el kiosko">
            <Item label="Estudio asignado" desc='en el paso de pago se muestra "Incluye sesión de hoy · Estudio A" para que el cliente sepa adónde ir.' />
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
            <p className="text-gray-400 text-sm">El sistema registra la asistencia automáticamente cuando el cliente ingresa su DNI. No requiere intervención manual.</p>
          </Bloque>
          <Bloque titulo="Al ingresar el DNI">
            <Item label="Notificación pendiente" desc="si el cliente tiene una notificación activa, se muestra antes de cualquier otra acción." />
            <Item label="Horario activo ahora o en los próximos 15 min" desc="se registra asistencia y se suma el precio por hora a la deuda." />
            <Item label="Sin horario activo" desc="pasa directo a la pantalla de pago con la deuda acumulada." />
          </Bloque>
          <Bloque titulo="No asistencias automáticas">
            <Item label="Cron horario" desc="todos los días a los :15 de cada hora, el sistema detecta los clientes cuyo horario ya terminó y no ingresaron, y les cobra el precio de reserva." />
            <Item label="Sin intervención manual" desc="no es necesario marcar inasistencias desde el panel." />
          </Bloque>
          <Bloque>
            <div className="flex gap-2 flex-wrap">
              <Badge color="green" texto="Asistió" />
              <span className="text-gray-400 text-sm">→ cobró precio por hora</span>
            </div>
            <div className="flex gap-2 flex-wrap mt-1">
              <Badge color="red" texto="Reserva" />
              <span className="text-gray-400 text-sm">→ no asistió, cobró precio de reserva</span>
            </div>
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
            <Item label="2. Notificación" desc="si tiene una notificación activa, la ve y la acepta antes de continuar." />
            <Item label="3a. Tiene horario activo" desc="se registra la asistencia y pasa a pagar." />
            <Item label="3b. Sin horario activo" desc="pasa directo a la pantalla de pago con su deuda actual." />
            <Item label="4. Elige el monto" desc="puede pagar el total o un monto parcial." />
            <Item label="5. Escanea el QR" desc="con la app de Mercado Pago. El QR vence en 2 minutos." />
          </Bloque>
          <Bloque titulo="Notas">
            <Item label="Monto mínimo QR" desc="$15 (límite de Mercado Pago)." />
            <Item label="Si el QR vence" desc="vuelve al inicio automáticamente y la orden se cancela." />
            <Item label="Pago confirmado" desc="la deuda se actualiza automáticamente al recibir la notificación de MP." />
            <Item label="Límite de deuda" desc="si el cliente supera el límite configurado, no puede registrar sesión hasta pagar." />
          </Bloque>
        </div>
      ),
    },
    {
      id: "caja",
      titulo: "Caja",
      icono: "💵",
      contenido: (
        <div className="space-y-3">
          <Bloque titulo="Qué muestra">
            <Item label="Total recaudado" desc="suma de pagos QR y manuales del día seleccionado. Las bonificaciones no cuentan como ingreso." />
            <Item label="Lista de pagos" desc="cada pago con nombre, hora, DNI, motivo y badge de tipo." />
          </Bloque>
          <Bloque titulo="Tipos de pago">
            <div className="flex gap-2 flex-wrap">
              <Badge color="blue" texto="QR" />
              <span className="text-gray-400 text-sm">→ pago procesado por Mercado Pago</span>
            </div>
            <div className="flex gap-2 flex-wrap mt-1">
              <Badge color="gray" texto="Efectivo" />
              <span className="text-gray-400 text-sm">→ pago manual registrado desde caja</span>
            </div>
            <div className="flex gap-2 flex-wrap mt-1">
              <Badge color="yellow" texto="Bonif." />
              <span className="text-gray-400 text-sm">→ bonificación aplicada desde el perfil del cliente (no es ingreso real)</span>
            </div>
          </Bloque>
          <Bloque titulo="Registrar pago manual">
            <Item label="+ Registrar pago manual" desc="abre un modal para seleccionar el cliente, ingresar el monto y opcionalmente un motivo (ej: Efectivo - agosto)." />
            <Item label="Efecto" desc="reduce la deuda del cliente y aparece en la lista del día como Efectivo." />
          </Bloque>
          <Bloque titulo="Navegar por fecha">
            <Item label="Selector de fecha" desc="arriba a la derecha. Por defecto muestra el día de hoy." />
          </Bloque>
        </div>
      ),
    },
    {
      id: "stats",
      titulo: "Estadísticas",
      icono: "📊",
      contenido: (
        <div className="space-y-3">
          <Bloque titulo="Selector de período">
            <Item label="Hoy / Semana / Mes" desc="mostrás lo cobrado y las sesiones del período con un toque." />
            <Item label="Período personalizado" desc='elegí "Período", seleccioná fecha de inicio y fin, y presioná Aplicar.' />
          </Bloque>
          <Bloque titulo="Qué muestra">
            <Item label="Cobrado" desc="suma de pagos QR y manuales aprobados en el período. Las bonificaciones no se incluyen." />
            <Item label="Sesiones" desc="total, asistieron y ausentes en el período." />
            <Item label="Deudas pendientes" desc="los 10 clientes con mayor deuda activa (no depende del período)." />
          </Bloque>
          <Bloque titulo="Exportar CSV">
            <Item label="Seleccioná el mes" desc="en la sección Exportar pagos, elegí el mes y descargá el archivo." />
            <Item label="Formato" desc="CSV con columnas Fecha, Cliente, DNI, Monto, Tipo, Estado y MP Payment ID. Compatible con Excel y Google Sheets." />
          </Bloque>
        </div>
      ),
    },
    {
      id: "programas",
      titulo: "Programas",
      icono: "🎙️",
      contenido: (
        <div className="space-y-3">
          <Bloque titulo="Qué son los programas">
            <p className="text-gray-400 text-sm">Cada programa representa un espacio radial asignado a un cliente. Tienen nombre, descripción, fechas de vigencia y horarios por estudio.</p>
          </Bloque>
          <Bloque titulo="Crear un programa">
            <Item label="+ Nuevo" desc="seleccioná el cliente responsable, ingresá el nombre y opcionalmente descripción, DNI responsable y fecha de fin." />
            <Item label="Horarios" desc="agregá uno o más horarios al programa: estudio, día y rango horario. Un programa puede tener varios días y estudios." />
          </Bloque>
          <Bloque titulo="Editar y eliminar">
            <Item label="Editar" desc='tocá "Editar" en el programa para modificar datos o ajustar horarios.' />
            <Item label="Eliminar" desc="elimina el programa y todos sus horarios asociados." />
          </Bloque>
          <Bloque titulo="En el calendario">
            <Item label="Bloques de programa" desc="aparecen superpuestos en el calendario de horarios. Al tocar un bloque podés ir al perfil del cliente." />
          </Bloque>
        </div>
      ),
    },
    {
      id: "notificaciones",
      titulo: "Notificaciones",
      icono: "🔔",
      contenido: (
        <div className="space-y-3">
          <Bloque titulo="Qué son">
            <p className="text-gray-400 text-sm">Mensajes que aparecen en el kiosko cuando un cliente ingresa su DNI, antes del registro de asistencia o pago. Se muestran siempre que estén activas.</p>
          </Bloque>
          <Bloque titulo="Tipos de notificación">
            <div className="flex gap-2 flex-wrap">
              <Badge color="blue" texto="General" />
              <span className="text-gray-400 text-sm">→ aviso, comunicado, mantenimiento, etc.</span>
            </div>
            <div className="flex gap-2 flex-wrap mt-1">
              <Badge color="orange" texto="Aumento de cuota" />
              <span className="text-gray-400 text-sm">→ informa el nuevo precio por hora. Se muestra el monto destacado.</span>
            </div>
          </Bloque>
          <Bloque titulo="Crear una notificación">
            <Item label="Título y texto" desc="el título se muestra grande, el texto es el cuerpo del mensaje." />
            <Item label="Desde / Hasta" desc="la notificación solo se muestra en ese rango de fechas." />
            <Item label="Destinatarios" desc="podés enviársela a todos los clientes activos o seleccionar clientes específicos." />
          </Bloque>
          <Bloque titulo="Estados">
            <div className="flex gap-2 flex-wrap">
              <Badge color="blue" texto="Programada" />
              <span className="text-gray-400 text-sm">→ fecha de inicio en el futuro</span>
            </div>
            <div className="flex gap-2 flex-wrap mt-1">
              <Badge color="green" texto="Activa" />
              <span className="text-gray-400 text-sm">→ se muestra a los clientes hoy</span>
            </div>
            <div className="flex gap-2 flex-wrap mt-1">
              <Badge color="gray" texto="Expirada" />
              <span className="text-gray-400 text-sm">→ ya pasó la fecha de expiración</span>
            </div>
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
          <Bloque titulo="Precios globales">
            <Item label="Precio por hora" desc="monto que se cobra cuando el cliente asiste a su sesión." />
            <Item label="Precio de reserva" desc="monto que se cobra cuando el cliente no asiste (inasistencia automática)." />
            <Item label="Límite de deuda" desc="si la deuda supera este monto, el cliente no puede registrar sesión hasta pagar. Con 0 no hay límite." />
          </Bloque>
          <Bloque titulo="Aumento masivo de precios">
            <Item label="Porcentaje" desc="ingresá el % de aumento y la fecha desde cuándo rige." />
            <Item label="Efecto" desc="aplica el aumento a todos los clientes activos. Si un cliente no tiene precio individual, se le crea uno a partir del precio global." />
          </Bloque>
          <Bloque titulo="Mercado Pago">
            <Item label="Conectar" desc="completá nombre del negocio, dirección, ciudad y provincia, luego tocá Conectar con Mercado Pago. Te redirige a MP para autorizar." />
            <Item label="Estado Conectado" desc="los pagos QR funcionan. Se muestra el Collector ID y la caja asociada." />
            <Item label="Reconectar" desc="si el token vence o querés cambiar de cuenta, usá el botón Reconectar Mercado Pago." />
            <Item label="Desvincular" desc="deshabilita los cobros QR hasta que vuelvas a conectar." />
          </Bloque>
          <Bloque titulo="Sucursal MP">
            <Item label="Ver sucursal" desc="muestra la sucursal registrada en tu cuenta de MP (nombre, ID, dirección, external ID)." />
            <Item label="Eliminar sucursal" desc="elimina la sucursal de MP. No afecta los pagos pendientes." />
            <Item label="Activar monto fijo en caja" desc="asegura que la caja POS tenga fixed_amount activado, requerido para los QR dinámicos." />
          </Bloque>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-gray-950 px-4 py-6 pb-6 sm:pl-64">
      <div className="max-w-lg mx-auto space-y-4">

        <h1 className="text-white font-bold text-xl pl-12">Ayuda</h1>

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
      <AdminNav />
    </div>
  );
}
