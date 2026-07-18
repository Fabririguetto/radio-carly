# WOX Rosario — Sistema de cobro

Kiosco de autoatención para registro de asistencia y cobro con Mercado Pago. Los clientes ingresan su DNI, confirman su asistencia al horario del día y pagan con QR directamente desde la pantalla.

## Stack

- **Next.js 16** (Pages Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **MySQL** (pool con `mysql2/promise`)
- **Mercado Pago `/v1/orders`** — QR dinámico (mode: dynamic), sin SDK

## Flujo de uso

```
DNI → Sesión → Monto → QR Mercado Pago
```

1. **DNI** — el cliente ingresa su número de documento
2. **Sesión** — se muestran los horarios del día; confirma si asistió (`Enter`) o no (`0`/`*`)
3. **Monto** — pre-cargado con la deuda total, editable; `Enter` para continuar
4. **QR** — se crea una orden en MP (`/v1/orders`, modo dinámico); el QR se genera con `qrcode` y se muestra en pantalla; polling cada 3 s detecta el pago; timeout de 60 s y cancelación automática de la orden al vencer

Si el DNI corresponde a un administrador, redirige al panel de admin.

## Panel de administración (`/admin`)

- Gestión de clientes (alta, baja, edición)
- Horarios semanales por cliente
- Configuración de precios (`precio_hora`, `precio_reserva`)
- Setup del QR POS de Mercado Pago

## Base de datos

Importar `radio.sql` en MySQL. Tablas:

| Tabla | Descripción |
|---|---|
| `clientes` | Datos de cada cliente (DNI, nombre) |
| `ctacte` | Cuenta corriente: ingresos, egresos y balance (deuda) |
| `horarios` | Horarios fijos semanales por cliente |
| `sesiones` | Registro de cada sesión (asistió, monto cobrado) |
| `pagos` | Pagos procesados via Mercado Pago |
| `config` | Precios configurables (`precio_hora`, `precio_reserva`) |

## Variables de entorno

Crear `.env` en la raíz del proyecto:

```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=radio

# Mercado Pago
MP_ACCESS_TOKEN=APP_USR-...
MP_COLLECTOR_ID=292346935
MP_POS_EXTERNAL_ID=CAJA001

# Webhooks (opcional — si no está definido se omite la validación de firma)
MP_WEBHOOK_SECRET=tu_webhook_secret
```

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:3000
```

## Producción

```bash
npm run build
npm start
```

## Estructura

```
src/
├── lib/
│   └── db.ts                   # Pool de conexión MySQL
├── pages/
│   ├── index.tsx               # Kiosco de autoatención
│   ├── pago-exitoso.tsx
│   ├── pago-fallido.tsx
│   ├── admin/
│   │   ├── index.tsx           # Dashboard admin
│   │   ├── clientes.tsx
│   │   ├── clientes/[id].tsx
│   │   ├── horarios.tsx
│   │   └── config.tsx
│   └── api/
│       ├── clientes/
│       ├── sesiones/
│       ├── pagos/              # crear, estado, cancelar, webhook
│       └── admin/
└── styles/
    └── globals.css
radio.sql                       # Schema y datos de ejemplo
```
