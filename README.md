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
DNI → Horario del día → Monto → QR Mercado Pago → Confirmación
```

1. **DNI** — el cliente ingresa su número de documento
2. **Sesión** — si hay un horario activo (ventana de –15 min desde el inicio), se registra la asistencia automáticamente (`precio_hora`). Si no, se muestran los horarios del día y se confirma asistencia con `Enter` (asistió) o `0`/`*` (no asistió, se cobra `precio_reserva`)
3. **Monto** — pre-cargado con la deuda total (`ctacte.balance`), editable; mínimo $15
4. **QR** — se crea una orden en MP (`/v1/orders`, modo dinámico, expiración 2 min); el QR se genera con la lib `qrcode` y se muestra en pantalla; polling cada 3 s detecta el pago; timeout de 60 s con cancelación automática
5. **Éxito** — se actualiza `ctacte` (ingreso += monto, balance -= monto)

Si el DNI corresponde al administrador, redirige al panel de admin.

---

## Panel de administración (`/admin`)

- **Clientes** — alta, edición, historial de sesiones y pagos (últimos 30 de cada uno)
- **Horarios** — horarios fijos semanales por cliente, con detección de solapamientos globales
- **Precios** — configuración de `precio_hora` y `precio_reserva`
- **Mercado Pago** — OAuth completo (connect/disconnect), info del negocio, sucursal y caja
- **Ayuda** — guía de uso

---

## Base de datos

Importar `radio.sql` en MySQL (incluye schema y datos de ejemplo).

```bash
mysql -u root -p radio < radio.sql
```

### Tablas

| Tabla | Columnas clave | Descripción |
|---|---|---|
| `clientes` | `idcliente`, `dni` (UNIQUE), `nombre` | Registro de clientes |
| `ctacte` | `idctacte`, `idcliente` (UQ), `ingreso`, `egreso`, `balance` | Cuenta corriente; `balance = egreso - ingreso` (deuda) |
| `horarios` | `idhorario`, `idcliente`, `dia_semana` (1–7), `hora_inicio`, `hora_fin` | Horarios fijos semanales |
| `sesiones` | `idsesion`, `idcliente`, `idhorario`, `fecha`, `asistio` (0/1/NULL), `monto` | Registro de sesiones (PK única: `idhorario + fecha`) |
| `pagos` | `idpago`, `idcliente`, `monto`, `mp_order_id`, `mp_payment_id`, `estado`, `fecha` | Pagos procesados vía MP |
| `config` | `id=1` (singleton) | Precios, credenciales MP, datos del negocio |

### Columnas de `config`

`precio_hora`, `precio_reserva`, `nombre_negocio`, `direccion`, `ciudad`, `provincia`,
`mp_access_token`, `mp_collector_id`, `mp_pos_external_id`, `mp_webhook_secret`,
`mp_refresh_token`, `mp_token_expires_at`

---

## Variables de entorno

Crear `.env` en la raíz:

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

# Mercado Pago (credenciales de producción)
MP_ACCESS_TOKEN=APP_USR-...
MP_COLLECTOR_ID=292346935
MP_POS_EXTERNAL_ID=CAJA001

# OAuth de MP (solo si se usa el flujo OAuth desde el admin)
MP_CLIENT_ID=
MP_CLIENT_SECRET=

# Webhook (si no está definido se omite la validación de firma)
MP_WEBHOOK_SECRET=tu_webhook_secret

# Cron job
CRON_SECRET=tu_cron_secret

# URL pública (necesaria para webhooks y OAuth callback)
NEXT_PUBLIC_APP_URL=https://radio-carly-production.up.railway.app

# Opcional: integración avanzada MP
MP_PLATFORM_ID=
MP_INTEGRATOR_ID=
```

---

## API Endpoints

### Públicos / Kiosco

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/clientes/[dni]` | Busca cliente por DNI; devuelve `idcliente`, `nombre`, `balance` |
| `POST` | `/api/sesiones` | Registra una sesión (actualiza `ctacte`) |
| `GET` | `/api/sesiones/hoy?idcliente=` | Horarios y sesiones del día para un cliente |
| `POST` | `/api/pagos/crear` | Crea orden MP; devuelve `orderId` y QR como data URL |
| `GET` | `/api/pagos/estado?orderId=` | Consulta estado de la orden (polling 3 s) |
| `POST` | `/api/pagos/cancelar` | Cancela una orden pendiente |
| `GET` | `/api/pagos/confirmar` | Confirma pago por `payment_id` (fallback legacy) |
| `POST` | `/api/pagos/webhook` | Webhook de Mercado Pago (firma HMAC-SHA256) |

### Cron

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/cron/no-asistencias` | `x-cron-secret` | Registra no-asistencias para horarios ya finalizados del día |

### Admin (requieren sesión admin)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/admin/auth` | Login con DNI + password |
| `GET/POST` | `/api/admin/clientes` | Listar / crear clientes |
| `GET` | `/api/admin/clientes/[id]` | Detalle del cliente con sesiones y pagos |
| `GET/POST` | `/api/admin/clientes/[id]/horarios` | Ver / agregar horarios del cliente |
| `GET` | `/api/admin/horarios` | Todos los horarios con nombre de cliente |
| `DELETE` | `/api/admin/horarios/[id]` | Eliminar horario (cascade sesiones) |
| `GET/PUT` | `/api/admin/config` | Ver / actualizar precios |
| `GET/DELETE/PATCH` | `/api/admin/mp-config` | Ver / desconectar / editar datos del negocio MP |
| `POST` | `/api/admin/mp-oauth-start` | Iniciar flujo OAuth con MP |
| `GET` | `/api/admin/mp-oauth-callback` | Callback OAuth (crea sucursal + caja automáticamente) |
| `GET/DELETE` | `/api/admin/mp-stores` | Listar / eliminar sucursales MP |
| `POST` | `/api/admin/mp-update-pos` | Asegurar que el POS tenga `fixed_amount=true` |
| `POST` | `/api/admin/mp-connect-webhook` | Evento de desautorización OAuth de MP |
| `POST` | `/api/admin/mp-pos-setup` | Configuración manual del POS |

---

## Integración Mercado Pago

### Flujo OAuth (desde el admin)

1. Admin completa datos del negocio en `/admin/config`
2. Presiona "Conectar con Mercado Pago" → `mp-oauth-start` guarda los datos y redirige a la pantalla de autorización de MP
3. El usuario aprueba → MP redirige a `mp-oauth-callback`
4. El callback intercambia el código por `access_token` + `refresh_token` y crea automáticamente una sucursal y un POS en MP
5. Las credenciales se guardan en la tabla `config`

### Flujo de pago (QR dinámico)

- Endpoint: `POST /v1/orders`
- `type: "qr"`, `mode: "dynamic"`, expiración 2 minutos
- La app genera el QR a partir del campo `qr_data` de la respuesta usando la lib `qrcode`
- El cliente escanea con la app Mercado Pago
- La app hace polling a `/api/pagos/estado` cada 3 s hasta detectar `aprobado`

### Seguridad de webhooks

- Validación HMAC-SHA256 con `x-signature` de MP
- Formato del mensaje: `id:{id};request-id:{requestId};ts:{timestamp};`
- Secreto configurado en la tabla `config` (`mp_webhook_secret`)

### Refresh de tokens

- Si `mp_token_expires_at` está a menos de 7 días, se refresca automáticamente
- Cache de 5 minutos en `getMpConfig()`

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
│   │   ├── db.ts                     # Pool de conexión MySQL
│   │   └── mp.ts                     # Gestión de config y tokens MP
│   └── pages/
│       ├── index.tsx                 # Kiosco de autoatención
│       ├── pago-exitoso.tsx          # Página de éxito (fallback)
│       ├── pago-fallido.tsx          # Página de error (fallback)
│       ├── admin/
│       │   ├── index.tsx             # Login admin
│       │   ├── clientes.tsx          # Gestión de clientes
│       │   ├── clientes/[id].tsx     # Detalle de cliente
│       │   ├── horarios.tsx          # Gestión de horarios
│       │   ├── config.tsx            # Configuración y MP
│       │   └── ayuda.tsx             # Guía de uso
│       └── api/
│           ├── clientes/             # [dni].ts, index.ts
│           ├── sesiones/             # index.ts, hoy.ts
│           ├── pagos/                # crear, estado, cancelar, confirmar, webhook
│           ├── cron/                 # no-asistencias.ts
│           └── admin/                # auth, clientes, horarios, config, mp-*
├── public/                           # Assets estáticos
├── radio.sql                         # Schema y datos de ejemplo
├── .env                              # Variables de entorno (no commitear)
├── next.config.ts
├── tailwind.config.*
└── tsconfig.json
```

---

## Autenticación

- **Admin**: DNI (`MASTER_DNI`) + contraseña (`ADMIN_PASSWORD`) → flag `admin=1` en `sessionStorage`
- **Clientes**: solo DNI (sin contraseña)
- **Cron**: header `x-cron-secret`
- **Webhooks MP**: firma HMAC-SHA256 en header `x-signature`

No hay JWT ni sesiones server-side para el admin.

---

## Deploy en Railway

1. Crear proyecto en Railway y conectar el repositorio
2. Agregar un servicio MySQL y copiar las credenciales
3. Configurar todas las variables de entorno listadas arriba
4. El deploy es automático en cada push a `main`
5. Railway detecta Node.js y ejecuta `next build && next start`
6. Configurar el webhook de MP apuntando a `https://<tu-dominio>/api/pagos/webhook`
