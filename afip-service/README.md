# Microservicio de Facturación Electrónica ARCA (ex-AFIP)

Este servicio se conecta **directamente** a los Web Services oficiales de **ARCA** (WSAA y WSFE v1) de Argentina, sin intermediarios pagos ni librerías de terceros pagas.

---

## Requisitos Previos

1. **Node.js 18+** instalado.
2. **OpenSSL** instalado y accesible en el PATH del sistema (o instalado mediante Git for Windows).
3. Certificado digital (`.crt`) emitido por ARCA/AFIP y Clave privada (`.key`).

---

## Configuración de Certificados

Podés configurar los certificados de dos formas:

### Opción A: Archivos locales (Desarrollo)
Colocá los archivos en la carpeta:
```
afip-service/certificados/mi_certificado.crt
afip-service/certificados/mi_clave_privada.key
```

### Opción B: Variables de entorno (Railway / Docker / Producción)
Definí las variables de entorno con el contenido en texto (incluyendo `-----BEGIN CERTIFICATE-----` etc.):
- `AFIP_CERT`: Contenido del archivo `.crt`
- `AFIP_KEY`: Contenido del archivo `.key`

---

## Ejecución del Servicio

```bash
cd afip-service
npm install
npm start
```
Por defecto escucha en el puerto `3001` (configurable mediante la variable `PORT`).

---

## Endpoints

### `GET /health`
Verifica si el servicio está activo y si detectó los certificados configurados:
```json
{
  "status": "ok",
  "service": "afip-service",
  "timestamp": "2026-10-05T20:30:00.000Z",
  "hasCertificates": true
}
```

### `POST /emitir`
Emite una factura electrónica y solicita el CAE correspondiente.
**Payload:**
```json
{
  "cuit": "20123456789",
  "produccion": false,
  "ptoVenta": 1,
  "tipoComprobante": 11,
  "idPago": 45,
  "total": 5000.00,
  "tipoDocCodigo": "DNI",
  "nroDocumento": "38123456"
}
```
**Respuesta exitosa:**
```json
{
  "ok": true,
  "cae": "74431234567890",
  "caeVencimiento": "2026-10-15",
  "nroComprobante": 105
}
```
