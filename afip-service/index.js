const express = require('express');
const fs      = require('fs');
const path    = require('path');
const os      = require('os');
const { getTA }                              = require('./wsaa');
const { getUltimoComprobante, solicitarCAE } = require('./wsfe');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '2mb' }));

// CORS simple para llamadas desde el panel o localhost
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    next();
});

function resolverCertPaths() {
    const certEnv = process.env.AFIP_CERT;
    const keyEnv  = process.env.AFIP_KEY;

    if (certEnv && keyEnv) {
        const certPath = path.join(os.tmpdir(), 'afip_cert.crt');
        const keyPath  = path.join(os.tmpdir(), 'afip_key.key');
        fs.writeFileSync(certPath, certEnv.replace(/\\n/g, '\n'), 'utf8');
        fs.writeFileSync(keyPath,  keyEnv.replace(/\\n/g, '\n'),  'utf8');
        console.log('[AFIP] Cert/Key cargados desde variables de entorno');
        return { certPath, keyPath };
    }

    const certDir = path.join(__dirname, 'certificados');
    if (!fs.existsSync(certDir)) {
        try { fs.mkdirSync(certDir, { recursive: true }); } catch {}
    }

    const archivos = fs.existsSync(certDir) ? fs.readdirSync(certDir) : [];
    const crt = archivos.find(f => f.endsWith('.crt'));
    const key = archivos.find(f => f.endsWith('.key'));

    if (!crt || !key) {
        console.warn(`[AFIP] Aviso: No se encontró archivo .crt o .key en ${certDir}. Para emitir facturas se requieren certificados válidos.`);
        return { certPath: null, keyPath: null };
    }

    console.log(`[AFIP] Cert: ${crt} | Key: ${key}`);
    return {
        certPath: path.join(certDir, crt),
        keyPath:  path.join(certDir, key),
    };
}

let { certPath: CERT_PATH, keyPath: KEY_PATH } = resolverCertPaths();

// Mapeo tipo_documentos → DocTipo ARCA
const DOC_TIPO = {
    DNI: 96,
    CUIT: 80,
    CUIL: 86,
    CDI: 87,
    Pasaporte: 94,
    LC: 89,
    LE: 90,
    CF: 99,
};

function resolverDoc(tipoDocCodigo, nroDocumento) {
    const docTipo = DOC_TIPO[tipoDocCodigo] ?? (nroDocumento ? 96 : 99);
    const docNro  = docTipo === 99
        ? 0
        : parseInt((String(nroDocumento) || '').replace(/\D/g, '') || '0', 10);
    return { docTipo, docNro };
}

// Factura B/A (6/1): IVA 21% incluido en total
// Factura C (11): monotributista, sin discriminación de IVA
function calcularImportes(tipoComprobante, total) {
    total = Math.round(Number(total) * 100) / 100;
    if (tipoComprobante === 11) {
        return { impTotal: total, impNeto: total, impIVA: 0, iva: null };
    }
    const impIVA  = Math.round(total * 21 / 121 * 100) / 100;
    const impNeto = Math.round((total - impIVA) * 100) / 100;
    return {
        impTotal: total,
        impNeto,
        impIVA,
        iva: { id: 5, baseImp: impNeto, importe: impIVA }, // Id 5 = 21%
    };
}

// POST /emitir
app.post('/emitir', async (req, res) => {
    // Si los certs no estaban al inicio, volver a verificar por si se agregaron
    if (!CERT_PATH || !KEY_PATH) {
        const paths = resolverCertPaths();
        CERT_PATH = paths.certPath;
        KEY_PATH = paths.keyPath;
    }

    if (!CERT_PATH || !KEY_PATH) {
        return res.status(500).json({
            ok: false,
            error: 'No se encontraron certificados (.crt y .key) en afip-service/certificados ni en variables AFIP_CERT/AFIP_KEY.',
        });
    }

    const {
        cuit, produccion, ptoVenta, tipoComprobante,
        idPago, total, tipoDocCodigo, nroDocumento
    } = req.body;

    if (!cuit) return res.status(400).json({ ok: false, error: 'Falta cuit emisor.' });
    if (!ptoVenta) return res.status(400).json({ ok: false, error: 'Falta ptoVenta.' });
    if (!total || Number(total) <= 0) return res.status(400).json({ ok: false, error: 'Monto total inválido.' });

    const tipoCbte = tipoComprobante || 11; // 11 = Factura C

    try {
        const { token, sign } = await getTA(cuit, CERT_PATH, KEY_PATH, produccion === true);

        const ultimo  = await getUltimoComprobante(cuit, token, sign, produccion === true, ptoVenta, tipoCbte);
        const cbteNro = ultimo + 1;

        const imp = calcularImportes(tipoCbte, total);
        const { docTipo, docNro } = resolverDoc(tipoDocCodigo, nroDocumento);

        const hoy     = new Date();
        const cbteFch = `${hoy.getFullYear()}${String(hoy.getMonth()+1).padStart(2,'0')}${String(hoy.getDate()).padStart(2,'0')}`;

        const result = await solicitarCAE({
            cuit, token, sign, produccion: produccion === true,
            ptoVta: ptoVenta, cbteTipo: tipoCbte, cbteNro,
            docTipo, docNro, cbteFch,
            impTotal: imp.impTotal, impNeto: imp.impNeto, impIVA: imp.impIVA,
            iva: imp.iva,
        });

        console.log(`[ARCA OK] Pago #${idPago} → CAE ${result.cae} (Cbte ${cbteNro})`);
        return res.json({ ok: true, ...result });

    } catch (err) {
        console.error(`[ARCA ERROR] Pago #${idPago}:`, err.message);
        return res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /health
app.get('/health', (_, res) => {
    return res.json({
        status: 'ok',
        service: 'afip-service',
        timestamp: new Date().toISOString(),
        hasCertificates: Boolean(CERT_PATH && KEY_PATH),
    });
});

app.listen(PORT, () => {
    console.log(`[afip-service] Servidor escuchando en http://localhost:${PORT}`);
    console.log('[afip-service] Conexión directa a ARCA (ex-AFIP) vía SOAP sin intermediarios');
});
