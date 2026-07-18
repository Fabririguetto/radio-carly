# Mercado Pago — Configuración

## Credenciales de la app (producción)

| Dato | Valor |
|---|---|
| Client ID | 4445532423872027 |
| Client Secret | snIKLRZtxyOFu5fDMCJ1cRgMx7KiGGXV |
| Public Key | APP_USR-e1ac7159-078f-491c-be18-4100f9f30793 |
| Access Token | APP_USR-4445532423872027-052708-7e0eaddb7b01d381e00329cd1eec0a02-292346935 |
| User ID (collector) | 292346935 |

## Sucursal (producción)

| Dato | Valor |
|---|---|
| ID | 84940068 |
| Nombre | WOX Rosario |
| External ID | WOX001 |
| Ubicación | Sin calle 0, Rosario, Santa Fe, Argentina |

## Caja (producción)

| Dato | Valor |
|---|---|
| ID | 135497735 |
| Nombre | Caja 1 |
| External ID | CAJA001 |
| Store ID | 84940068 |
| UUID | c9f75a85636b47da8832bbfc54001e4f5286ba35555740da93076c4aa01db203 |

## Sucursal (test)

| Dato | Valor |
|---|---|
| ID | 79124043 |

## Caja (test)

| Dato | Valor |
|---|---|
| ID | 135498281 |
| External ID | CAJA001TEST |

## Variables Railway — producción

```env
MP_ACCESS_TOKEN=APP_USR-4445532423872027-052708-7e0eaddb7b01d381e00329cd1eec0a02-292346935
MP_COLLECTOR_ID=292346935
MP_POS_EXTERNAL_ID=CAJA001
MP_WEBHOOK_SECRET=<valor del panel MP → Tu negocio → Notificaciones>
```

## Variables Railway — test

```env
MP_ACCESS_TOKEN=APP_USR-1250349473...  # token de test
MP_COLLECTOR_ID=292346935
MP_POS_EXTERNAL_ID=CAJA001TEST
MP_WEBHOOK_SECRET=<mismo secret del panel>
```

## Webhook

- URL configurada en panel MP: `https://radio-carly-production.up.railway.app/api/pagos/webhook`
- Tipo de evento: `order`
- Validación: HMAC-SHA256 con `MP_WEBHOOK_SECRET`

## Medición de calidad

Para medir la integración en el panel de MP se necesita un `payment ID` de producción.
Ir a: Tus integraciones → app → Medir calidad → ingresar payment ID productivo.

## QR estático de la caja (producción)

Imagen: https://www.mercadopago.com/instore/merchant/qr/135497735/c9f75a85636b47da8832bbfc54001e4f5286ba35555740da93076c4aa01db203.png

Template PDF: https://www.mercadopago.com/instore/merchant/qr/135497735/template_c9f75a85636b47da8832bbfc54001e4f5286ba35555740da93076c4aa01db203.pdf
