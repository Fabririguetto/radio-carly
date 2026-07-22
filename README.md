# WOX Rosario — Sistema de cobro

Kiosco de autoatención para registro de asistencia y cobro con Mercado Pago. Los clientes ingresan su DNI, confirman su asistencia al horario del día y pagan con QR directamente desde la pantalla.

Desplegado en Railway: `https://radio-carly-production.up.railway.app`

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (Pages Router) + React 19 + TypeScript 5 |
| Estilos | Tailwind CSS v4 |
| Base de datos | MySQL 8+ con `mysql2/promise` (pool) |
| Pagos | Mercado Pago `/v1/orders` — QR dinámico (sin SDK) |
| Deploy | Railway (Node.js 20+) |

---

## Flujo del kiosco

```
DNI → Notificación (si hay) → Monto → QR Mercado Pago → Ticket
```

1. **DNI** — el cliente ingresa su número de documento. Si el DNI corresponde al administrador, redirige al panel de admin.
2. **Notificación** — si hay una notificación activa para el cliente (aumento de cuota, aviso general), se muestra antes de continuar.
3. **Sesión** — si hay un horario activo (ventana de ±15 min desde el inicio), se registra la asistencia automáticamente (`precio_hora`). Si no hay horario activo pero hay uno registrado hoy, se usa ese. Si no hay sesión, se cobra el saldo pendiente.
4. **Monto** — pre-cargado con la deuda total (`ctacte.balance` + sesión de hoy si aplica), editable; mínimo $15.
5. **QR** — se crea una orden en MP (`/v1/orders`, modo dinámico, expiración 2 min); el QR se genera con la lib `qrcode` y se muestra en pantalla; polling cada 3 s detecta el pago; timeout de 60 s con 2 s de gracia antes de cancelar.
6. **Ticket** — se imprime comprobante automáticamente al detectar el pago aprobado.

---

## Panel de administración (`/admin`)

Acceso exclusivo desde el kiosco ingresando el DNI maestro.

- **Calendario** — vista semanal de horarios por estudio, con drag & drop (15 min snapping)
- **Clientes** — alta, edición, historial de sesiones y pagos, bonificaciones, precios individuales
- **Estudios** — CRUD de estudios/salas, activar/desactivar
- **Programas** — programas de radio por cliente, con horarios por estudio
- **Caja** — pagos del día, registro manual (QR / efectivo / bonificación)
- **Estadísticas** — cobrado, sesiones y top deudores por período; exportación CSV
- **Notificaciones** — envío de avisos a clientes (general o aumento de cuota)
- **Ajustes** — precios globales, aumento masivo por porcentaje, configuración de Mercado Pago
- **Ayuda** — guía de uso interactiva

---

## Base de datos

Importar `radio.sql` en MySQL (incluye schema y datos de ejemplo).

```bash
mysql -u root -p radio < radio.sql
```

También se requiere la tabla de rate limiting (crear una vez):

```sql
CREATE TABLE IF NOT EXISTS rate_limits (
  `key` VARCHAR(255) NOT NULL PRIMARY KEY,
  count INT NOT NULL DEFAULT 1,
  reset_at DATETIME(3) NOT NULL
);
```

### Tablas

| Tabla | Descripción |
|---|---|
| `clientes` | Registro de clientes (`idcliente`, `dni` UNIQUE, `nombre`, `activo`) |
| `ctacte` | Cuenta corriente por cliente (`ingreso`, `egreso`, `balance = egreso - ingreso`) |
| `horarios` | Horarios fijos semanales (`idcliente`, `idestudio`, `dia_semana` 1–7, `hora_inicio`, `hora_fin`) |
| `sesiones` | Registro de asistencia (`idcliente`, `idhorario`, `fecha`, `asistio`, `monto`). PK única: `idhorario + fecha` |
| `pagos` | Pagos procesados (`idcliente`, `monto`, `tipo`, `estado`, `mp_order_id`, `mp_payment_id`) |
| `estudios` | Salas/estudios (`nombre`, `activo`) |
| `programas` | Programas de radio por cliente (`nombre`, `descripcion`, `fecha_inicio`, `fecha_fin`) |
| `programas_horarios` | Horarios de cada programa (`idprograma`, `idestudio`, `dia_semana`, `hora_inicio`, `hora_fin`) |
| `precios_historial` | Historial de precios por cliente (`precio_hora`, `precio_reserva`, `fecha_desde`, `fecha_hasta`) |
| `notificaciones` | Avisos enviados a clientes (`titulo`, `texto`, `tipo`, `fecha_inicio`, `fecha_expiracion`) |
| `notificaciones_clientes` | Relación notificación ↔ cliente con estado de aceptación |
| `config` | Singleton de configuración (id=1) |
| `rate_limits` | Control de rate limiting por IP (persistente entre reinicios) |

### Columnas de `config`

`precio_hora`, `precio_reserva`, `deuda_maxima`, `nombre_negocio`, `direccion`, `ciudad`, `provincia`,
`mp_access_token`, `mp_collector_id`, `mp_pos_external_id`, `mp_webhook_secret`,
`mp_refresh_token`, `mp_token_expires_at`

> **Toda la configuración de Mercado Pago se gestiona desde la tabla `config` vía el panel de admin.** No se usan variables de entorno para las credenciales de MP.

---

## Variables de entorno

Crear `.env` en la raíz (o configurar en Railway):

```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=radio

# Admin
MASTER_DNI=99999999
ADMIN_PASSWORD=tu_password_admin

# Sesiones admin — cambiar para revocar todas las sesiones activas (opcional)
ADMIN_TOKEN_VERSION=1

# OAuth de Mercado Pago (necesario para conectar MP desde el panel de admin)
MP_CLIENT_ID=tu_client_id
MP_CLIENT_SECRET=tu_client_secret

# Cron job
CRON_SECRET=tu_cron_secret

# URL pública (necesaria para webhooks y OAuth callback)
NEXT_PUBLIC_APP_URL=https://tu-dominio.up.railway.app

# Opcional: integración avanzada MP
MP_PLATFORM_ID=
MP_INTEGRATOR_ID=
```

---

## API Endpoints

### Públicos / Kiosco

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/clientes/[dni]` | Busca cliente activo por DNI; devuelve `idcliente`, `nombre`, `balance` |
| `POST` | `/api/sesiones` | Registra una sesión (actualiza `ctacte`) |
| `GET` | `/api/sesiones/hoy?idcliente=` | Horarios y sesiones del día para un cliente |
| `POST` | `/api/pagos/crear` | Crea orden MP; devuelve `orderId` y QR como data URL |
| `GET` | `/api/pagos/estado?orderId=` | Consulta estado de la orden (polling 3 s) |
| `POST` | `/api/pagos/cancelar` | Cancela una orden pendiente |
| `GET` | `/api/pagos/confirmar` | Confirma pago por `payment_id` (fallback Checkout Pro) |
| `POST` | `/api/pagos/webhook` | Webhook de Mercado Pago (firma HMAC-SHA256) |
| `GET` | `/api/notificaciones/pendiente?idcliente=` | Notificación activa no aceptada |
| `POST` | `/api/notificaciones/pendiente` | Marca notificación como aceptada |
| `GET` | `/api/config-publica` | Nombre del negocio (sin auth) |

### Cron

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/cron/no-asistencias` | `x-cron-secret` | Registra no-asistencias para horarios finalizados sin sesión del día |

### Admin (requieren sesión admin)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/admin/auth` | Login con DNI + password |
| `DELETE` | `/api/admin/auth` | Logout (limpia cookie) |
| `GET` | `/api/admin/me` | Verifica sesión activa |
| `GET/POST` | `/api/admin/clientes` | Listar / crear clientes |
| `GET/PATCH` | `/api/admin/clientes/[id]` | Detalle / toggle activo |
| `GET/POST` | `/api/admin/clientes/[id]/horarios` | Ver / agregar horarios |
| `GET/POST/DELETE` | `/api/admin/clientes/[id]/precios` | Historial de precios individual |
| `POST` | `/api/admin/clientes/[id]/bonificacion` | Acreditar saldo a favor |
| `GET` | `/api/admin/horarios` | Todos los horarios con cliente y estudio |
| `DELETE` | `/api/admin/horarios/[id]` | Eliminar horario (cascade sesiones) |
| `GET/POST` | `/api/admin/estudios` | Listar / crear estudios |
| `PATCH/DELETE` | `/api/admin/estudios/[id]` | Renombrar / toggle activo / eliminar |
| `GET/POST/PUT/DELETE` | `/api/admin/programas` | CRUD de programas de radio |
| `GET/PUT` | `/api/admin/config` | Ver / actualizar precios globales |
| `GET/POST` | `/api/admin/caja` | Pagos del día / registrar pago manual |
| `GET` | `/api/admin/stats` | Estadísticas por período (máx. 366 días) |
| `GET` | `/api/admin/export` | CSV de pagos por mes |
| `GET/POST/DELETE` | `/api/admin/notificaciones` | CRUD de notificaciones |
| `POST` | `/api/admin/precios/actualizacion-masiva` | Aumento % a todos los clientes activos |
| `GET/DELETE/PATCH` | `/api/admin/mp-config` | Ver / desconectar / editar datos MP |
| `POST` | `/api/admin/mp-oauth-start` | Iniciar flujo OAuth con MP |
| `GET` | `/api/admin/mp-oauth-callback` | Callback OAuth (crea sucursal + caja) |
| `GET/DELETE` | `/api/admin/mp-stores` | Listar / eliminar sucursales MP |
| `POST` | `/api/admin/mp-update-pos` | Asegurar `fixed_amount=true` en el POS |
| `POST` | `/api/admin/mp-connect-webhook` | Webhook de desautorización OAuth de MP |
| `POST` | `/api/admin/mp-pos-setup` | Configuración manual del POS |

---

## Integración Mercado Pago

### Configuración

Toda la configuración de MP (access token, collector ID, POS, webhook secret) se almacena en la tabla `config` y se gestiona desde el panel de admin en `/admin/config`. No requiere variables de entorno de MP.

Solo se necesitan `MP_CLIENT_ID` y `MP_CLIENT_SECRET` en las variables de entorno para poder iniciar el flujo OAuth.

### Flujo OAuth (desde el admin)

1. Admin completa datos del negocio en `/admin/config`
2. Presiona "Conectar con Mercado Pago" → `mp-oauth-start` redirige a MP
3. El usuario aprueba → MP redirige a `mp-oauth-callback`
4. El callback intercambia el código por `access_token` + `refresh_token`, crea sucursal y POS automáticamente, y guarda todo en `config`

### Flujo de pago (QR dinámico)

- Endpoint MP: `POST /v1/orders`
- `type: "qr"`, `mode: "dynamic"`, expiración 2 minutos
- La app genera el QR a partir de `qr_data` usando la lib `qrcode`
- El cliente escanea con la app Mercado Pago
- Polling a `/api/pagos/estado` cada 3 s; doble procesamiento prevenido con `SELECT FOR UPDATE`
- Al detectar pago: se actualiza `ctacte` y se imprime ticket automáticamente

### Seguridad de webhooks

- Validación HMAC-SHA256 con `x-signature` de MP
- Formato del mensaje: `id:{id};request-id:{requestId};ts:{timestamp};`
- Secreto almacenado en `config.mp_webhook_secret`

### Refresh de tokens

- Si `mp_token_expires_at` está a menos de 7 días, se refresca automáticamente
- Caché de 5 minutos en `getMpConfig()` con mutex para evitar refreshes concurrentes

---

## Autenticación

| Actor | Mecanismo |
|---|---|
| Admin | DNI maestro (`MASTER_DNI`) ingresado en el kiosco → contraseña (`ADMIN_PASSWORD`) → cookie HMAC-SHA256, 30 días |
| Clientes | Solo DNI (sin contraseña) |
| Cron | Header `x-cron-secret` |
| Webhooks MP | Firma HMAC-SHA256 en header `x-signature` |

La cookie de sesión admin es verificada por el middleware de Next.js (Edge runtime). Para revocar todas las sesiones: cambiar `ADMIN_TOKEN_VERSION` en Railway.

---

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

### Scripts disponibles

| Script | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Servidor de producción |
| `npm run lint` | ESLint |

---

## Estructura del proyecto

```
radio-carly/
├── src/
│   ├── lib/
│   │   ├── db.ts              # Pool de conexión MySQL
│   │   ├── mp.ts              # Config y tokens MP (con caché y mutex)
│   │   ├── adminAuth.ts       # Creación y verificación de tokens admin
│   │   ├── precios.ts         # Precio vigente por cliente y fecha
│   │   └── rateLimit.ts       # Rate limiting persistente en DB
│   ├── middleware.ts          # Protección de /api/admin/* (Edge runtime)
│   └── pages/
│       ├── index.tsx          # Kiosco de autoatención
│       ├── pago-exitoso.tsx   # Página de éxito (fallback Checkout Pro)
│       ├── pago-fallido.tsx   # Página de error (fallback Checkout Pro)
│       ├── admin/
│       │   ├── index.tsx      # Login admin
│       │   ├── horarios.tsx   # Calendario semanal (drag & drop)
│       │   ├── clientes.tsx   # Gestión de clientes
│       │   ├── clientes/[id].tsx
│       │   ├── estudios.tsx
│       │   ├── programas.tsx
│       │   ├── caja.tsx
│       │   ├── stats.tsx
│       │   ├── notificaciones.tsx
│       │   ├── config.tsx     # Precios y configuración MP
│       │   └── ayuda.tsx
│       └── api/
│           ├── clientes/
│           ├── sesiones/
│           ├── pagos/         # crear, estado, cancelar, confirmar, webhook, link
│           ├── notificaciones/
│           ├── cron/
│           └── admin/         # auth, clientes, horarios, estudios, programas,
│                              # caja, stats, export, notificaciones, config, mp-*
├── public/
├── radio.sql                  # Schema y datos de ejemplo
├── .env                       # Variables de entorno (no commitear)
├── next.config.ts
└── tsconfig.json
```

---

## Deploy en Railway

1. Crear proyecto en Railway y conectar el repositorio
2. Agregar un servicio MySQL y copiar las credenciales de conexión
3. Configurar las variables de entorno listadas arriba (solo las de DB, admin y MP OAuth)
4. Importar `radio.sql` en la base de datos
5. Crear la tabla `rate_limits` (SQL en la sección Base de datos)
6. El deploy es automático en cada push a `main`
7. Configurar el webhook de MP apuntando a `https://<tu-dominio>/api/pagos/webhook`
8. Conectar MP desde el panel de admin en `/admin/config`
