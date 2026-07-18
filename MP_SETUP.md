# Mercado Pago — Configuración de producción

## Credenciales de la app

| Dato | Valor |
|---|---|
| Client ID | 4445532423872027 |
| Client Secret | snIKLRZtxyOFu5fDMCJ1cRgMx7KiGGXV |
| Public Key | APP_USR-e1ac7159-078f-491c-be18-4100f9f30793 |
| Access Token | APP_USR-4445532423872027-052708-7e0eaddb7b01d381e00329cd1eec0a02-292346935 |
| User ID (collector) | 292346935 |

## Sucursal

| Dato | Valor |
|---|---|
| ID | 84940068 |
| Nombre | WOX Rosario |
| External ID | WOX001 |
| Ubicación | Sin calle 0, Rosario, Santa Fe, Argentina |

## Caja (POS)

| Dato | Valor |
|---|---|
| ID | 135497735 |
| Nombre | Caja 1 |
| External ID | CAJA001 |
| Store ID | 84940068 |
| UUID | c9f75a85636b47da8832bbfc54001e4f5286ba35555740da93076c4aa01db203 |

## Variables .env

```env
MP_ACCESS_TOKEN=APP_USR-4445532423872027-052708-7e0eaddb7b01d381e00329cd1eec0a02-292346935
MP_COLLECTOR_ID=292346935
MP_POS_EXTERNAL_ID=CAJA001
```

## QR estático de la caja

Imagen: https://www.mercadopago.com/instore/merchant/qr/135497735/c9f75a85636b47da8832bbfc54001e4f5286ba35555740da93076c4aa01db203.png

Template PDF: https://www.mercadopago.com/instore/merchant/qr/135497735/template_c9f75a85636b47da8832bbfc54001e4f5286ba35555740da93076c4aa01db203.pdf
