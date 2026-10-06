/**
 * wsfe1 — Web Service de Facturación Electrónica de ARCA/AFIP
 * Llama directo a los servidores de ARCA vía SOAP, sin intermediarios.
 */
const axios = require('axios');

const WSFE_URL_TEST = 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx';
const WSFE_URL_PROD = 'https://servicios1.afip.gov.ar/wsfev1/service.asmx';
const NS = 'http://ar.gov.afip.dif.FEV1/';

function url(produccion) {
    return produccion ? WSFE_URL_PROD : WSFE_URL_TEST;
}

function authXml(cuit, token, sign) {
    return `<Auth><Token>${token}</Token><Sign>${sign}</Sign><Cuit>${cuit}</Cuit></Auth>`;
}

async function soapPost(produccion, action, body) {
    const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <${action} xmlns="${NS}">
      ${body}
    </${action}>
  </soap12:Body>
</soap12:Envelope>`;

    const res = await axios.post(url(produccion), envelope, {
        headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
        timeout: 30000,
    });
    return res.data;
}

/**
 * Devuelve el último número de comprobante autorizado para un pto de venta + tipo.
 */
async function getUltimoComprobante(cuit, token, sign, produccion, ptoVta, cbteTipo) {
    const xml = await soapPost(produccion, 'FECompUltimoAutorizado',
        `${authXml(cuit, token, sign)}
         <PtoVta>${ptoVta}</PtoVta>
         <CbteTipo>${cbteTipo}</CbteTipo>`
    );
    const nro = xml.match(/<CbteNro>(\d+)<\/CbteNro>/)?.[1];
    return parseInt(nro || '0', 10);
}

/**
 * Solicita CAE para un comprobante.
 */
async function solicitarCAE({
    cuit, token, sign, produccion,
    ptoVta, cbteTipo, cbteNro,
    docTipo, docNro, cbteFch,
    impTotal, impNeto, impIVA, iva,
}) {
    const ivaXml = iva
        ? `<Iva><AlicIva>` +
          `<Id>${iva.id}</Id>` +
          `<BaseImp>${iva.baseImp.toFixed(2)}</BaseImp>` +
          `<Importe>${iva.importe.toFixed(2)}</Importe>` +
          `</AlicIva></Iva>`
        : '';

    const xml = await soapPost(produccion, 'FECAESolicitar',
        `${authXml(cuit, token, sign)}
         <FeCAEReq>
           <FeCabReq>
             <CantReg>1</CantReg>
             <PtoVta>${ptoVta}</PtoVta>
             <CbteTipo>${cbteTipo}</CbteTipo>
           </FeCabReq>
           <FeDetReq>
             <FECAEDetRequest>
               <Concepto>1</Concepto>
               <DocTipo>${docTipo}</DocTipo>
               <DocNro>${docNro}</DocNro>
               <CbteDesde>${cbteNro}</CbteDesde>
               <CbteHasta>${cbteNro}</CbteHasta>
               <CbteFch>${cbteFch}</CbteFch>
               <ImpTotal>${impTotal.toFixed(2)}</ImpTotal>
               <ImpTotConc>0.00</ImpTotConc>
               <ImpNeto>${impNeto.toFixed(2)}</ImpNeto>
               <ImpOpEx>0.00</ImpOpEx>
               <ImpIVA>${impIVA.toFixed(2)}</ImpIVA>
               <ImpTrib>0.00</ImpTrib>
               <MonId>PES</MonId>
               <MonCotiz>1</MonCotiz>
               ${ivaXml}
             </FECAEDetRequest>
           </FeDetReq>
         </FeCAEReq>`
    );

    // Verificar resultado
    const resultado = xml.match(/<Resultado>([A-Z]+)<\/Resultado>/)?.[1];
    if (resultado !== 'A') {
        const msg  = xml.match(/<Msg>([\s\S]*?)<\/Msg>/)?.[1]   || 'Error desconocido de ARCA';
        const code = xml.match(/<Code>(\d+)<\/Code>/)?.[1]      || '?';
        const obs  = xml.match(/<MsgObs>([\s\S]*?)<\/MsgObs>/)?.[1];
        throw new Error(`ARCA (${code}): ${msg}${obs ? ' — ' + obs : ''}`);
    }

    const cae    = xml.match(/<CAE>(\d+)<\/CAE>/)?.[1];
    const caeVto = xml.match(/<CAEFchVto>(\d{8})<\/CAEFchVto>/)?.[1];
    if (!cae) throw new Error('No se recibió CAE en la respuesta de ARCA');

    const caeVencimiento = caeVto
        ? `${caeVto.slice(0,4)}-${caeVto.slice(4,6)}-${caeVto.slice(6,8)}`
        : null;

    return { cae, caeVencimiento, nroComprobante: cbteNro };
}

module.exports = { getUltimoComprobante, solicitarCAE };
