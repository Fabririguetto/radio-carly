/**
 * WSAA — Autenticación y Autorización de ARCA/AFIP
 * Firma el TRA con OpenSSL smime.
 * Sincroniza la hora con time.afip.gov.ar vía NTP antes de generar el TRA.
 */
const axios         = require('axios');
const dgram         = require('dgram');
const { spawnSync } = require('child_process');
const os            = require('os');
const fs            = require('fs');
const path          = require('path');

const WSAA_URL_TEST = 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms';
const WSAA_URL_PROD = 'https://wsaa.afip.gov.ar/ws/services/LoginCms';
const NTP_SERVER    = 'time.afip.gov.ar';
// Diferencia entre epoch NTP (1900) y Unix (1970): 70 años en segundos
const NTP_EPOCH_DELTA = 2208988800;

const tokenCache = new Map();

function findOpenSSL() {
    const candidates = [
        'openssl',
        'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
        'C:\\OpenSSL-Win64\\bin\\openssl.exe',
        'C:\\OpenSSL-Win32\\bin\\openssl.exe',
    ];
    for (const p of candidates) {
        try {
            const r = spawnSync(p, ['version'], { encoding: 'utf8' });
            if (r.status === 0) return p;
        } catch {}
    }
    return 'openssl';
}

const OPENSSL = findOpenSSL();

/**
 * Consulta time.afip.gov.ar por NTP y devuelve un Date con la hora de AFIP.
 * Fallback: Date.now() si el servidor no responde en 4 segundos.
 */
function getNTPTime() {
    return new Promise(resolve => {
        const client  = dgram.createSocket('udp4');
        const packet  = Buffer.alloc(48);
        packet[0] = 0x1B; // LI=0, VN=3, Mode=3 (client request)

        const fallback = setTimeout(() => {
            console.warn('[WSAA] NTP timeout — usando reloj local como fallback');
            try { client.close(); } catch {}
            resolve(new Date());
        }, 4000);

        client.on('error', () => {
            clearTimeout(fallback);
            console.warn('[WSAA] NTP error — usando reloj local como fallback');
            try { client.close(); } catch {}
            resolve(new Date());
        });

        client.on('message', msg => {
            clearTimeout(fallback);
            try { client.close(); } catch {}
            // Transmit Timestamp: bytes 40-43 (segundos), 44-47 (fracción)
            const secs = msg.readUInt32BE(40);
            const frac = msg.readUInt32BE(44);
            const unixMs = (secs - NTP_EPOCH_DELTA) * 1000
                         + Math.round((frac / 0x100000000) * 1000);
            const ntpDate = new Date(unixMs);
            const drift   = ntpDate.getTime() - Date.now();
            console.log(`[WSAA] NTP sync OK: ${ntpDate.toISOString()} (drift: ${drift > 0 ? '+' : ''}${drift}ms)`);
            resolve(ntpDate);
        });

        client.send(packet, 123, NTP_SERVER, err => {
            if (err) {
                clearTimeout(fallback);
                console.warn('[WSAA] NTP send error — usando reloj local como fallback');
                try { client.close(); } catch {}
                resolve(new Date());
            }
        });
    });
}

function generarTRA(servicio, now) {
    const expira = new Date(now.getTime() + 10 * 60 * 1000);
    const fmt    = d => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

    const genTime = fmt(now);
    const expTime = fmt(expira);
    const uid     = Math.floor(now.getTime() / 1000);

    const tra = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<loginTicketRequest version="1.0">',
        '  <header>',
        `    <uniqueId>${uid}</uniqueId>`,
        `    <generationTime>${genTime}</generationTime>`,
        `    <expirationTime>${expTime}</expirationTime>`,
        '  </header>',
        `  <service>${servicio}</service>`,
        '</loginTicketRequest>',
    ].join('\n');

    console.log('[WSAA] TRA generationTime:', genTime, '| expirationTime:', expTime);
    return tra;
}

function firmarTRAOpenSSL(tra, certPath, keyPath) {
    if (!certPath || !keyPath || !fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        throw new Error('Certificado o clave privada no encontrados. Configurá los certificados en afip-service/certificados o en variables de entorno.');
    }

    const pid    = process.pid;
    const tmpTra = path.join(os.tmpdir(), `afip_tra_${pid}_${Date.now()}.xml`);
    const tmpOut = path.join(os.tmpdir(), `afip_cms_${pid}_${Date.now()}.der`);

    try {
        fs.writeFileSync(tmpTra, tra, 'utf8');

        const r = spawnSync(OPENSSL, [
            'smime', '-sign',
            '-signer', certPath,
            '-inkey',  keyPath,
            '-in',     tmpTra,
            '-nodetach',
            '-outform', 'DER',
            '-out',    tmpOut,
        ], { encoding: 'buffer' });

        if (r.status !== 0) {
            const err = (r.stderr || Buffer.alloc(0)).toString('utf8').trim();
            throw new Error(`OpenSSL smime -sign falló (${r.status}): ${err}`);
        }

        const der = fs.readFileSync(tmpOut);
        console.log('[WSAA] CMS firmado OK, tamaño DER:', der.length, 'bytes');
        return der.toString('base64');

    } finally {
        try { fs.unlinkSync(tmpTra); } catch {}
        try { fs.unlinkSync(tmpOut); } catch {}
    }
}

async function loginCms(cms, produccion) {
    const url  = produccion ? WSAA_URL_PROD : WSAA_URL_TEST;
    const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
    xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:wsaa="https://wsaa.afip.gov.ar/ws/services/LoginCms">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in0>${cms}</wsaa:in0>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

    let res;
    try {
        res = await axios.post(url, soap, {
            headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' },
            timeout: 30000,
        });
    } catch (err) {
        if (err.response) {
            const body  = String(err.response.data || '');
            console.error('[WSAA] SOAP FAULT:\n', body.substring(0, 800));
            const faultCode = body.match(/<faultcode[^>]*>([\s\S]*?)<\/faultcode>/i)?.[1]?.trim() ?? '';
            const fault     = body.match(/<faultstring[^>]*>([\s\S]*?)<\/faultstring>/i)?.[1]
                           || body.substring(0, 300);

            if (faultCode.includes('alreadyAuthenticated')) {
                throw new Error('WSAA_ALREADY_AUTH: ARCA ya tiene un TA válido para este certificado. Esperá unos minutos y volvé a intentar.');
            }

            throw new Error(`WSAA HTTP ${err.response.status}: ${fault?.trim()}`);
        }
        throw err;
    }

    const xml      = res.data;
    const rawMatch = xml.match(/<loginCmsReturn[^>]*>([\s\S]*?)<\/loginCmsReturn>/)?.[1]?.trim() ?? '';
    if (!rawMatch) throw new Error('WSAA: respuesta vacía de ARCA');

    let taXml;
    if (rawMatch.startsWith('&lt;') || rawMatch.startsWith('&amp;')) {
        taXml = rawMatch
            .replace(/&lt;/g,   '<')
            .replace(/&gt;/g,   '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&amp;/g,  '&');
    } else if (rawMatch.startsWith('<![CDATA[')) {
        const inner = rawMatch.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
        taXml = Buffer.from(inner, 'base64').toString('utf8');
    } else {
        taXml = Buffer.from(rawMatch, 'base64').toString('utf8');
    }

    const token = taXml.match(/<token>([\s\S]*?)<\/token>/)?.[1];
    const sign  = taXml.match(/<sign>([\s\S]*?)<\/sign>/)?.[1];
    if (!token || !sign) {
        console.error('[WSAA] TA XML recibido:\n', taXml.substring(0, 400));
        throw new Error('WSAA: no se pudieron extraer token y firma');
    }

    const expIso = taXml.match(/<expirationTime>([\s\S]*?)<\/expirationTime>/)?.[1];
    const expMs  = expIso ? new Date(expIso).getTime() : Date.now() + 11 * 60 * 60 * 1000;

    return { token, sign, expMs };
}

async function getTA(cuit, certPath, keyPath, produccion, servicio = 'wsfe') {
    const cacheKey = `${cuit}|${servicio}|${produccion}`;
    const cached   = tokenCache.get(cacheKey);

    if (cached && cached.expMs > Date.now() + 5 * 60 * 1000) {
        return cached;
    }

    const now = await getNTPTime();
    const tra = generarTRA(servicio, now);
    console.log('[WSAA] Solicitando TA para CUIT', cuit, '| Ambiente:', produccion ? 'PRODUCCIÓN' : 'HOMOLOGACIÓN');
    const cms = firmarTRAOpenSSL(tra, certPath, keyPath);
    const ta  = await loginCms(cms, produccion);

    tokenCache.set(cacheKey, ta);
    return ta;
}

module.exports = { getTA };
