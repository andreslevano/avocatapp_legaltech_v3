"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = exports.generateStudentDocumentPackage = exports.createCheckoutSession = exports.analyzeDocuments = exports.getUserStatus = exports.reactivateUser = exports.checkUserStatusByEmail = exports.updateUserStatus = exports.cleanupUser = exports.enableUser = exports.disableUser = exports.getUserStats = exports.accionTutela = exports.reclamacionCantidades = exports.testOpenAI = exports.extraccionDatosExtract = exports.helloWorld = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const cors = __importStar(require("cors"));
const express = __importStar(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const jspdf_1 = __importDefault(require("jspdf"));
const path_1 = __importDefault(require("path"));
const busboy_1 = __importDefault(require("busboy"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const docx_1 = require("docx");
const params_1 = require("firebase-functions/params");
const uuid_1 = require("uuid");
// Initialize Firebase Admin
admin.initializeApp();
// Define secrets (optional - will use environment variables if secrets not available)
// Note: defineSecret requires billing to be enabled. For deployment without billing,
// set USE_ENV_VARS=true to skip secret definitions and use environment variables only.
let stripeSecretKey;
let stripeWebhookSecret;
let openaiApiKey;
let stripePriceIdTutela;
// Only define secrets if not using environment variables only
if (process.env.USE_ENV_VARS !== 'true') {
    try {
        stripeSecretKey = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
        stripeWebhookSecret = (0, params_1.defineSecret)("STRIPE_WEBHOOK_SECRET");
        openaiApiKey = (0, params_1.defineSecret)("OPENAI_API_KEY");
        stripePriceIdTutela = (0, params_1.defineSecret)("STRIPE_PRICE_ID_TUTELA");
    }
    catch (error) {
        console.warn('Secrets not available, will use environment variables');
    }
}
else {
    console.log('Using environment variables only (USE_ENV_VARS=true)');
}
// CORS middleware
const corsHandler = cors.default({ origin: true });
// OpenAI client setup
const openai_1 = __importDefault(require("openai"));
const pilot_users_1 = require("./pilot-users");
const resolveOpenAIKey = () => {
    // Cloud Functions v2: Use secrets via defineSecret
    // Try secret first, then fallback to environment variable
    if (openaiApiKey) {
        try {
            const apiKey = openaiApiKey.value();
            if (apiKey && apiKey.trim()) {
                return apiKey.trim();
            }
        }
        catch (error) {
            // Secret not available, try environment variable
            console.warn('OPENAI_API_KEY secret not available, trying environment variable');
        }
    }
    const envKey = process.env.OPENAI_API_KEY;
    if (envKey && envKey.trim()) {
        return envKey.trim();
    }
    throw new Error("OPENAI_API_KEY is not configured. Set it as a secret (firebase functions:secrets:set OPENAI_API_KEY) or environment variable.");
};
const resolveStripeSecretKey = () => {
    if (stripeSecretKey) {
        try {
            const key = stripeSecretKey.value();
            if (key && key.trim()) {
                return key.trim();
            }
        }
        catch (error) {
            console.warn('STRIPE_SECRET_KEY secret not available, trying environment variable');
        }
    }
    const envKey = process.env.STRIPE_SECRET_KEY;
    if (envKey && envKey.trim()) {
        return envKey.trim();
    }
    throw new Error("STRIPE_SECRET_KEY is not configured. Set it as a secret or environment variable.");
};
const resolveStripeWebhookSecret = () => {
    if (stripeWebhookSecret) {
        try {
            const secret = stripeWebhookSecret.value();
            if (secret && secret.trim()) {
                return secret.trim();
            }
        }
        catch (error) {
            console.warn('STRIPE_WEBHOOK_SECRET secret not available, trying environment variable');
        }
    }
    const envKey = process.env.STRIPE_WEBHOOK_SECRET;
    if (envKey && envKey.trim()) {
        return envKey.trim();
    }
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured. Set it as a secret or environment variable.");
};
const createOpenAIClient = () => {
    const apiKey = resolveOpenAIKey();
    return new openai_1.default({ apiKey });
};
const FONT_DIR = path_1.default.join(__dirname, "..", "assets", "fonts");
const FONT_REGULAR_PATH = path_1.default.join(FONT_DIR, "SourceSans3-Regular.otf");
const FONT_BOLD_PATH = path_1.default.join(FONT_DIR, "SourceSans3-Bold.otf");
const ensureFontAvailability = () => {
    // DISABLED: Custom fonts cause "Unknown font format" errors with fontkit
    // Always use built-in fonts for reliability
    // TODO: If custom fonts are needed, convert .otf to .ttf or use a different approach
    console.log('ℹ️ Using built-in Helvetica fonts (custom fonts disabled due to fontkit compatibility issues)');
    return false;
    // Original code (disabled):
    // const regularExists = fs.existsSync(FONT_REGULAR_PATH);
    // const boldExists = fs.existsSync(FONT_BOLD_PATH);
    // if (!regularExists || !boldExists) {
    //   console.warn(`⚠️ Custom fonts not found. Using built-in fonts.`);
    //   return false;
    // }
    // return true;
};
const slugify = (value) => {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'general';
};
const DEFAULT_STUDENT_COUNTRY = "España";
const splitTextIntoParagraphs = (text) => {
    return text
        .split(/\r?\n/)
        .map((line) => line.trimEnd())
        .reduce((acc, line) => {
        if (!line.trim()) {
            if (acc[acc.length - 1] !== '') {
                acc.push('');
            }
            return acc;
        }
        if (acc.length === 0) {
            return [line];
        }
        const last = acc[acc.length - 1];
        if (last === '') {
            acc.push(line);
        }
        else {
            acc[acc.length - 1] = `${last}\n${line}`;
        }
        return acc;
    }, [])
        .filter(Boolean);
};
const createDocxBuffer = async (options) => {
    const paragraphs = splitTextIntoParagraphs(options.body).map((block) => {
        const lines = block.split('\n');
        const children = lines.map((line, index) => index === 0
            ? new docx_1.TextRun({ text: line, size: 24 })
            : new docx_1.TextRun({ text: line, break: 1, size: 24 }));
        return new docx_1.Paragraph({
            children,
            spacing: { after: 240 },
        });
    });
    const document = new docx_1.Document({
        sections: [
            {
                headers: {
                    default: new docx_1.Header({
                        children: [
                            new docx_1.Paragraph({
                                alignment: docx_1.AlignmentType.CENTER,
                                children: [
                                    new docx_1.TextRun({ text: "Avocat LegalTech", bold: true, size: 28 }),
                                    new docx_1.TextRun({
                                        text: "\nCentro de Excelencia Jurídica para Estudiantes",
                                        size: 20,
                                    }),
                                ],
                            }),
                        ],
                    }),
                },
                footers: {
                    default: new docx_1.Footer({
                        children: [
                            new docx_1.Paragraph({
                                alignment: docx_1.AlignmentType.CENTER,
                                children: [
                                    new docx_1.TextRun({
                                        text: options.footerNote || "Documento académico generado con IA por Avocat LegalTech",
                                        size: 18,
                                    }),
                                ],
                            }),
                        ],
                    }),
                },
                children: [
                    new docx_1.Paragraph({
                        heading: docx_1.HeadingLevel.TITLE,
                        alignment: docx_1.AlignmentType.CENTER,
                        children: [new docx_1.TextRun({ text: options.title, size: 36, bold: true })],
                        spacing: { after: 320 },
                    }),
                    options.subtitle
                        ? new docx_1.Paragraph({
                            alignment: docx_1.AlignmentType.CENTER,
                            children: [new docx_1.TextRun({ text: options.subtitle, size: 24, italics: true })],
                            spacing: { after: 320 },
                        })
                        : undefined,
                    ...paragraphs,
                ].filter(Boolean),
            },
        ],
    });
    const buffer = await docx_1.Packer.toBuffer(document);
    return Buffer.from(buffer);
};
const createPdfBuffer = (options) => {
    return new Promise((resolve, reject) => {
        try {
            // Use jsPDF (same library that worked in manual generation on Nov 13th)
            const doc = new jspdf_1.default({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
            });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const marginLeft = 20;
            const marginRight = 20;
            const marginTop = 30;
            const marginBottom = 30;
            const contentWidth = pageWidth - marginLeft - marginRight;
            let yPosition = marginTop;
            // Helper to add text with word wrapping
            const addText = (text, fontSize, isBold = false, color = "#111827", align = "left") => {
                doc.setFontSize(fontSize);
                doc.setTextColor(color);
                doc.setFont("helvetica", isBold ? "bold" : "normal");
                const lines = doc.splitTextToSize(text, contentWidth);
                // Check if we need a new page
                const lineHeight = fontSize * 0.4;
                if (yPosition + (lines.length * lineHeight) > pageHeight - marginBottom) {
                    doc.addPage();
                    yPosition = marginTop;
                    drawHeader();
                }
                lines.forEach((line) => {
                    let xPosition = marginLeft;
                    if (align === "center") {
                        xPosition = pageWidth / 2;
                    }
                    else if (align === "right") {
                        xPosition = pageWidth - marginRight;
                    }
                    doc.text(line, xPosition, yPosition, { align });
                    yPosition += lineHeight;
                });
            };
            // Draw header (will be called on each page)
            const drawHeader = () => {
                const headerY = marginTop - 10;
                doc.setFontSize(16);
                doc.setFont("helvetica", "bold");
                doc.setTextColor("#111827");
                doc.text("Avocat LegalTech", pageWidth / 2, headerY, { align: "center" });
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.setTextColor("#4b5563");
                doc.text("Centro de Documentos Jurídicos y Formación Profesional para Estudiantes", pageWidth / 2, headerY + 6, { align: "center" });
                // Draw line separator
                doc.setDrawColor("#e5e7eb");
                doc.line(marginLeft, headerY + 12, pageWidth - marginRight, headerY + 12);
            };
            // Draw footer
            const drawFooter = (pageNum) => {
                const footerY = pageHeight - marginBottom + 15;
                doc.setFontSize(9);
                doc.setFont("helvetica", "normal");
                doc.setTextColor("#4b5563");
                const footerText = options.footerNote || "Documento académico generado por Avocat LegalTech • Uso educativo";
                doc.text(footerText, pageWidth / 2, footerY, { align: "center" });
                doc.text(`Página ${pageNum}`, pageWidth - marginRight, footerY, { align: "right" });
            };
            // Draw initial header
            drawHeader();
            yPosition += 15;
            // Title
            addText(options.title, 16, true, "#111827", "center");
            yPosition += 5;
            // Subtitle
            if (options.subtitle) {
                addText(options.subtitle, 11, false, "#4b5563", "center");
                yPosition += 5;
            }
            yPosition += 5;
            // Body content
            const lines = options.body.split(/\r?\n/);
            const maxLines = 10000; // Safety limit
            for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
                const line = lines[i];
                if (!line.trim()) {
                    yPosition += 3; // Small spacing for empty lines
                }
                else {
                    // Check if we need a new page
                    if (yPosition > pageHeight - marginBottom - 20) {
                        const currentPage = doc.internal.pages.length;
                        drawFooter(currentPage);
                        doc.addPage();
                        yPosition = marginTop;
                        drawHeader();
                        yPosition += 15;
                    }
                    addText(line, 11, false, "#111827", "left");
                }
            }
            if (lines.length > maxLines) {
                console.warn(`⚠️ Body text truncated: ${lines.length} lines reduced to ${maxLines}`);
            }
            // Draw footer on all pages
            const totalPages = doc.internal.pages.length;
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                drawFooter(i);
            }
            // Convert to buffer
            const pdfOutput = doc.output("arraybuffer");
            const buffer = Buffer.from(pdfOutput);
            resolve(buffer);
        }
        catch (error) {
            console.error("Error creating PDF buffer:", error);
            reject(error);
        }
    });
};
/** Build storage path: {uid}/{userType}/{documentType}/{subfolder}/... */
function buildStoragePath(uid, userType, documentType, subfolder, ...parts) {
    const base = `${uid}/${userType}/${documentType}/${subfolder}`;
    return parts.length ? `${base}/${parts.join("/")}` : base;
}
const uploadToStorage = async (buffer, path, contentType) => {
    const bucket = admin.storage().bucket();
    const token = (0, uuid_1.v4)();
    await bucket.file(path).save(buffer, {
        resumable: false,
        metadata: {
            contentType,
            cacheControl: "public, max-age=3600",
            metadata: {
                firebaseStorageDownloadTokens: token,
            },
        },
    });
    return {
        path,
        downloadUrl: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`,
        contentType,
        size: buffer.length,
        token,
    };
};
// Helper function to handle CORS
const onRequestWithCors = (handler) => {
    return functions.https.onRequest((req, res) => {
        corsHandler(req, res, () => {
            handler(req, res);
        });
    });
};
// Helper function to handle CORS with secrets
const onRequestWithCorsAndSecrets = (options, handler) => {
    return functions.https.onRequest(options, (req, res) => {
        corsHandler(req, res, () => {
            handler(req, res);
        });
    });
};
// Test function
exports.helloWorld = onRequestWithCors((req, res) => {
    res.json({ message: "Hello from Firebase Functions!" });
});
// Helper to parse JSON body from request
const parseJsonBody = (req) => new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk.toString(); });
    req.on("end", () => {
        try {
            resolve(data ? JSON.parse(data) : {});
        }
        catch (e) {
            reject(e);
        }
    });
    req.on("error", reject);
});
// Helper: extract structured data from text via OpenAI (single document)
async function extractSingleWithOpenAI(openai, documentText, fileName, pageLabel, excelStructure) {
    var _a, _b;
    const docLabel = pageLabel ? `${fileName} (página ${pageLabel})` : fileName;
    const usePozuelo = excelStructure === "asesoria-pozuelo";
    const systemPrompt = usePozuelo
        ? `Eres un asistente experto en extracción de datos de facturas/recibos para asesoría fiscal (Estructura Asesoría Pozuelo).

Debes BUSCAR y extraer SIEMPRE estos conceptos (aunque la etiqueta del documento no sea exacta): Emisor, CIF PROVEEDORES, CIF CLIENTES, Nº FACTURA, FECHA, TOTAL, BASE 0%IVA, CUOTA 0%IVA, BASE 4%IVA, CUOTA 4%IVA, BASE 10%IVA, CUOTA 10%IVA, BASE 21%IVA, CUOTA 21%IVA, %JE IRPF, CUOTA IRPF, PAIS PROVEEDOR, PAIS CLIENTE, MONEDA. Asigna cada valor al campo que tenga sentido: no exijas que la etiqueta coincida literalmente (ej.: "Mercancia" con "10,00%" → BASE 10%IVA y CUOTA 10%IVA; "Total Imp." junto a 21% → CUOTA 21%IVA).

Si el documento tiene desglose de IVA por tipo (varias líneas con distintos %, ej. 4%, 10%, 21%), asigna CADA línea a su BASE X%IVA y CUOTA X%IVA correspondiente. No concentres todo en 21%.

Devuelve UNICAMENTE un JSON válido (sin markdown):
{
  "country": "país (España, Brasil, etc.)",
  "documentType": "Factura o Recibo",
  "emisor": "nombre del emisor (vendedor/proveedor)",
  "receptor": "nombre del receptor (cliente/comprador)",
  "fields": [
    {"key": "CIF PROVEEDORES", "value": "CIF/NIF del emisor"},
    {"key": "CIF CLIENTES", "value": "CIF/NIF del receptor"},
    {"key": "Nº FACTURA", "value": "número de factura"},
    {"key": "FECHA", "value": "fecha en formato DD/MM/YYYY"},
    {"key": "TOTAL", "value": "importe total"},
    {"key": "BASE 0%IVA", "value": "base imponible 0%"},
    {"key": "CUOTA 0%IVA", "value": "cuota IVA 0%"},
    {"key": "BASE 4%IVA", "value": "base imponible 4%"},
    {"key": "CUOTA 4%IVA", "value": "cuota IVA 4%"},
    {"key": "BASE 10%IVA", "value": "base imponible 10%"},
    {"key": "CUOTA 10%IVA", "value": "cuota IVA 10%"},
    {"key": "BASE 21%IVA", "value": "base imponible 21%"},
    {"key": "CUOTA 21%IVA", "value": "cuota IVA 21%"},
    {"key": "%JE IRPF", "value": "porcentaje IRPF"},
    {"key": "CUOTA IRPF", "value": "cuota IRPF"},
    {"key": "PAIS PROVEEDOR", "value": "país del emisor/proveedor"},
    {"key": "PAIS CLIENTE", "value": "país del receptor/cliente"},
    {"key": "MONEDA", "value": "EUR, BRL, etc."}
  ]
}
Reglas CRÍTICAS:
- NUNCA infieras Emisor o Receptor del nombre del archivo. Usa SOLO el contenido del documento. Emisor = quien emite/cobra (EMPRESA, vendedor, proveedor). Receptor = quien compra/recibe (Cliente, comprador).
- En recibos/tickets: "EMPRESA" o sección de empresa = Emisor; "Datos Cliente"/"Cliente" = Receptor. CIF/NIF junto a cada uno.
- Si no hay Total explícito pero hay líneas con importes, indica la suma si es calculable.
- MAPEA por significado: "NIF"/"CIF"/"NIF emisor" → CIF PROVEEDORES; "CIF receptor"/"NIF cliente" → CIF CLIENTES; "Fecha"/"Fecha emisión" → FECHA; "Importe total"/"Total" → TOTAL. Para IVA: cada línea de la tabla de impuestos a su BASE/CUOTA del % correspondiente.
- Solo si hay una única base/cuota sin desglose por tipo, usa BASE 21%IVA/CUOTA 21%IVA para esa línea.
- Incluye todos los campos que puedas extraer. Usa "-" únicamente cuando no haya ningún dato equivalente.
- Responde SOLO con el JSON.`
        : `Eres un asistente experto en extracción de datos de documentos. 
Analiza ÚNICAMENTE el texto proporcionado y devuelve un JSON válido con esta estructura exacta (sin markdown, sin explicaciones):
{
  "country": "país de origen del documento (ej: España, Estados Unidos, México)",
  "documentType": "tipo de documento: Factura, Recibo, Orden de compra, Contrato, Correspondencia, Certificado, Otro",
  "emisor": "quien EMITE la factura/recibo (vendedor, proveedor, empresa que cobra)",
  "receptor": "quien RECIBE/compró (cliente, comprador)",
  "fields": [
    {"key": "nombre del campo", "value": "valor extraído"}
  ]
}
Reglas CRÍTICAS: 
- Extrae SOLO datos que aparezcan en el texto. NUNCA infieras Emisor o Receptor del nombre del archivo.
- Emisor = quien emite/cobra (EMPRESA, vendedor, supermercado). Receptor = quien compra (Cliente). En recibos: EMPRESA=Emisor, Cliente=Receptor.
- Usa "-" cuando no encuentres un valor. Máximo 25 campos. Responde SOLO con el JSON.`;
    const userPrompt = `Documento: ${docLabel}\n\nTexto:\n${documentText.slice(0, 12000)}\n\nDevuelve el JSON:`;
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.2,
    });
    const content = ((_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "{}";
    const jsonStr = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    return {
        country: String(parsed.country || "Desconocido").trim(),
        documentType: String(parsed.documentType || "Otro").trim(),
        emisor: String(parsed.emisor || "-").trim(),
        receptor: String(parsed.receptor || "-").trim(),
        fields: (parsed.fields || []).slice(0, 25),
    };
}
// Helper: extract multiple documents from one page (2+ invoices per page)
async function extractMultiWithOpenAI(openai, documentText, fileName, pageLabel, excelStructure) {
    var _a, _b;
    const docLabel = `${fileName} (página ${pageLabel})`;
    const usePozuelo = excelStructure === "asesoria-pozuelo";
    const fieldsHint = usePozuelo
        ? 'Para cada documento usa SIEMPRE estas claves (aunque la etiqueta no sea exacta): CIF PROVEEDORES, CIF CLIENTES, Nº FACTURA, FECHA, TOTAL, BASE 0%IVA, CUOTA 0%IVA, BASE 4%IVA, CUOTA 4%IVA, BASE 10%IVA, CUOTA 10%IVA, BASE 21%IVA, CUOTA 21%IVA, %JE IRPF, CUOTA IRPF, PAIS PROVEEDOR, PAIS CLIENTE, MONEDA. Asigna cada valor al campo que tenga sentido (ej. línea 10% → BASE 10%IVA y CUOTA 10%IVA). NUNCA infieras del nombre del archivo. EMPRESA=Emisor, Cliente=Receptor.'
        : 'Extrae los campos más relevantes (emisor, receptor, número, fecha, total, etc.).';
    const systemPrompt = `Eres un asistente experto en extracción de datos. Esta página puede contener 2, 3, 4 o MÁS facturas/recibos distintos (cada uno con su propio emisor, total, fecha).
CRÍTICO: Una misma página puede tener 3, 4, 5 o más recibos/facturas. DEBES identificar y extraer TODOS. No te detengas en 2. Busca cada combinación distinta de emisor+receptor+total.
Analiza el texto con cuidado y devuelve UNICAMENTE un JSON con esta estructura (sin markdown):
{
  "documents": [
    {
      "country": "país",
      "documentType": "Factura o Recibo",
      "emisor": "nombre emisor",
      "receptor": "nombre receptor",
      "fields": [{"key": "nombre campo", "value": "valor"}]
    }
  ]
}
Reglas CRÍTICAS: Extrae SOLO datos del texto. NO inventes. NO infieras del nombre del archivo. Emisor = vendedor, Receptor = cliente. Identifica TODAS las facturas/recibos (pueden ser 3, 4 o más en una página). ${fieldsHint} Usa "-" si no hay valor. Responde SOLO con el JSON.`;
    const userPrompt = `Documento: ${docLabel}\n\nTexto (puede tener varias facturas):\n${documentText.slice(0, 12000)}\n\nDevuelve el JSON con "documents" array:`;
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        max_tokens: 4000,
        temperature: 0.2,
    });
    const content = ((_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "{}";
    const jsonStr = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    const docs = parsed.documents || [];
    return docs.map((d) => ({
        country: String(d.country || "Desconocido").trim(),
        documentType: String(d.documentType || "Otro").trim(),
        emisor: String(d.emisor || "-").trim(),
        receptor: String(d.receptor || "-").trim(),
        fields: (d.fields || []).slice(0, 25),
    }));
}
// Document AI integration for invoice extraction (Phase A)
const document_ai_1 = require("./document-ai");
// Extracción de datos con IA - categoriza y extrae datos de documentos (PDF, etc.)
// Supports: preExtractedText (OCR fallback), splitByPage (multi-invoice PDFs), Document AI (invoices)
// Must declare openaiApiKey secret so it is injected at runtime
exports.extraccionDatosExtract = onRequestWithCorsAndSecrets({
    secrets: openaiApiKey ? [openaiApiKey] : [],
    timeoutSeconds: 540,
    memory: "1GiB",
}, async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        const body = (req.body && typeof req.body === "object") ? req.body : await parseJsonBody(req);
        const { downloadURL, fileName, preExtractedText, preExtractedTextPerPage, splitByPage, excelStructure, multiInvoicePerPage, pageOffset, pageLimit, } = body;
        if (!fileName) {
            res.status(400).json({ error: "fileName es requerido" });
            return;
        }
        const hasInput = downloadURL || (preExtractedText && preExtractedText.trim()) || (preExtractedTextPerPage && Array.isArray(preExtractedTextPerPage) && preExtractedTextPerPage.length > 0);
        if (!hasInput) {
            res.status(400).json({ error: "downloadURL, preExtractedText o preExtractedTextPerPage son requeridos" });
            return;
        }
        const ext = fileName.toLowerCase().split(".").pop() || "";
        const isPdf = ext === "pdf";
        let pageTexts = [];
        if (preExtractedTextPerPage && Array.isArray(preExtractedTextPerPage) && preExtractedTextPerPage.length > 0) {
            pageTexts = preExtractedTextPerPage.map((t) => String(t || "").trim());
            if (pageTexts.length === 0)
                pageTexts = [(preExtractedText === null || preExtractedText === void 0 ? void 0 : preExtractedText.trim()) || ""].filter(Boolean);
        }
        if (pageTexts.length === 0 && preExtractedText && preExtractedText.trim()) {
            pageTexts = [preExtractedText.trim()];
        }
        if (pageTexts.length === 0 && downloadURL) {
            const response = await fetch(downloadURL);
            if (!response.ok) {
                throw new Error(`Error descargando archivo: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            // Phase A: Try Document AI first for single PDFs (no split), except Asesoría Pozuelo
            // which needs full IVA breakdown (4%, 10%, 21%) — use OpenAI only for that structure
            if (isPdf && !splitByPage && excelStructure !== "asesoria-pozuelo") {
                const docAiResult = await (0, document_ai_1.processInvoiceWithDocumentAI)(buffer, fileName, "application/pdf", excelStructure);
                if (docAiResult && docAiResult.fields.length >= 3) {
                    res.json(docAiResult);
                    return;
                }
            }
            if (isPdf && splitByPage) {
                const pageTextsCollected = [];
                const pagerender = (pageData) => pageData.getTextContent().then((textContent) => {
                    const text = (textContent.items || []).map((item) => item.str || "").join(" ");
                    pageTextsCollected.push(text);
                    return text;
                });
                const pdfData = await (0, pdf_parse_1.default)(buffer, { pagerender });
                pageTexts = pageTextsCollected;
                if (pageTexts.length === 0 && pdfData.text) {
                    pageTexts = [pdfData.text];
                }
            }
            else if (isPdf) {
                const pdfData = await (0, pdf_parse_1.default)(buffer);
                const text = pdfData.text || "";
                pageTexts = [text.trim() || `[Documento sin texto extraíble: ${fileName}]`];
            }
            else {
                pageTexts = [`[Documento ${fileName} - formato ${ext} no soportado para extracción de texto.]`];
            }
        }
        if (pageTexts.length === 0) {
            pageTexts = [`[Documento sin texto extraíble: ${fileName}]`];
        }
        const openai = createOpenAIClient();
        const MAX_PAGES_PER_BATCH = 25;
        const offset = Math.max(0, Number(pageOffset) || 0);
        const limit = Math.min(MAX_PAGES_PER_BATCH, Math.max(1, Number(pageLimit) || MAX_PAGES_PER_BATCH));
        const pagesToProcess = pageTexts.slice(offset, offset + limit);
        if (pagesToProcess.length === 1) {
            const text = pagesToProcess[0];
            const docText = !text.trim() || text.startsWith("[Documento sin texto") ? text : text;
            const textIsEmpty = !docText.trim() || docText.trim().length < 20 || docText.startsWith("[Documento sin texto");
            if (multiInvoicePerPage && docText.trim().length > 100) {
                const multiResults = await extractMultiWithOpenAI(openai, docText, fileName, "1", excelStructure);
                if (multiResults.length >= 1) {
                    res.json({
                        split: true,
                        totalPages: 1,
                        batchComplete: true,
                        items: multiResults.map((r, idx) => (Object.assign(Object.assign({}, r), { pageIndex: 1, subIndex: multiResults.length > 1 ? idx + 1 : undefined }))),
                    });
                    return;
                }
            }
            const result = await extractSingleWithOpenAI(openai, docText, fileName, undefined, excelStructure);
            if (textIsEmpty && isPdf) {
                res.json(Object.assign(Object.assign({}, result), { totalPages: pageTexts.length || 1, needsClientOcr: true, pageTexts }));
            }
            else {
                res.json(result);
            }
            return;
        }
        const results = [];
        for (let i = 0; i < pagesToProcess.length; i++) {
            const pageText = pagesToProcess[i];
            const pageNum = offset + i + 1;
            if (!pageText.trim() || pageText.trim().length < 20)
                continue;
            if (multiInvoicePerPage && pageText.trim().length > 100) {
                const multiResults = await extractMultiWithOpenAI(openai, pageText, fileName, String(pageNum), excelStructure);
                multiResults.forEach((r, idx) => results.push(Object.assign(Object.assign({}, r), { pageIndex: pageNum, subIndex: multiResults.length > 1 ? idx + 1 : undefined })));
            }
            else {
                const pageResult = await extractSingleWithOpenAI(openai, pageText, fileName, String(pageNum), excelStructure);
                results.push(Object.assign(Object.assign({}, pageResult), { pageIndex: pageNum }));
            }
        }
        if (results.length === 0 && pagesToProcess.length > 0) {
            const fallback = await extractSingleWithOpenAI(openai, pagesToProcess.join("\n\n"), fileName, undefined, excelStructure);
            const hasEmptyPages = pagesToProcess.every((t) => !t.trim() || t.trim().length < 20);
            res.json(Object.assign(Object.assign({}, fallback), { totalPages: hasEmptyPages ? pageTexts.length : 1, needsClientOcr: hasEmptyPages && pageTexts.length > 1, pageTexts: hasEmptyPages ? pageTexts : undefined }));
            return;
        }
        const batchComplete = offset + results.length >= pageTexts.length;
        const response = {
            split: true,
            totalPages: pageTexts.length,
            processedPages: results.length,
            pageOffset: offset,
            nextPageOffset: batchComplete ? null : offset + limit,
            batchComplete,
            truncated: !batchComplete,
            items: results,
        };
        // Return pageTexts when we extracted from PDF (downloadURL) so client can run selective OCR for empty pages
        if (!(preExtractedTextPerPage === null || preExtractedTextPerPage === void 0 ? void 0 : preExtractedTextPerPage.length) && pageTexts.length > 0) {
            response.pageTexts = pageTexts;
        }
        res.json(response);
    }
    catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        const errStack = error instanceof Error ? error.stack : undefined;
        console.error("Error extraccionDatosExtract:", errMsg, errStack || "");
        res.status(500).json({ error: errMsg });
    }
});
// OpenAI test function
exports.testOpenAI = onRequestWithCors(async (req, res) => {
    var _a, _b;
    try {
        const openai = createOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a helpful legal assistant." },
                { role: "user", content: "Hello, can you help me with legal matters?" }
            ],
            max_tokens: 150,
        });
        res.json({
            success: true,
            response: ((_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "No response",
        });
    }
    catch (error) {
        console.error("OpenAI Error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to get OpenAI response",
        });
    }
});
// Reclamación de cantidades function
exports.reclamacionCantidades = onRequestWithCors(async (req, res) => {
    var _a, _b, _c, _d;
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        const { nombreTrabajador, nombreEmpresa, fechaInicio, fechaFin, salarioBruto } = req.body;
        if (!nombreTrabajador || !nombreEmpresa || !fechaInicio || !fechaFin || !salarioBruto) {
            res.status(400).json({
                success: false,
                error: "Missing required fields"
            });
            return;
        }
        const prompt = `
    Genera un documento legal de reclamación de cantidades con los siguientes datos:
    
    - Trabajador: ${nombreTrabajador}
    - Empresa: ${nombreEmpresa}
    - Fecha inicio: ${fechaInicio}
    - Fecha fin: ${fechaFin}
    - Salario bruto: ${salarioBruto}
    
    El documento debe incluir:
    1. Encabezado formal
    2. Datos del trabajador y empresa
    3. Fundamentos legales
    4. Cálculo de cantidades adeudadas
    5. Peticiones específicas
    
    Formato el documento como un PDF profesional.
    `;
        const openai = createOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "Eres un abogado especializado en derecho laboral español. Genera documentos legales profesionales y precisos." },
                { role: "user", content: prompt }
            ],
            max_tokens: 2000,
        });
        // Save to Firestore
        const db = admin.firestore();
        const docRef = await db.collection("reclamaciones").add({
            nombreTrabajador,
            nombreEmpresa,
            fechaInicio,
            fechaFin,
            salarioBruto,
            documento: ((_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.json({
            success: true,
            documento: ((_d = (_c = completion.choices[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) || "",
            documentId: docRef.id,
        });
    }
    catch (error) {
        console.error("Error generating reclamación:", error);
        res.status(500).json({
            success: false,
            error: "Failed to generate document",
        });
    }
});
// Acción de tutela function
exports.accionTutela = onRequestWithCors(async (req, res) => {
    var _a, _b, _c, _d;
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        const { nombreDemandante, derechoVulnerado, hechos, peticiones } = req.body;
        if (!nombreDemandante || !derechoVulnerado || !hechos || !peticiones) {
            res.status(400).json({
                success: false,
                error: "Missing required fields"
            });
            return;
        }
        const prompt = `
    Genera un documento legal de acción de tutela con los siguientes datos:
    
    - Demandante: ${nombreDemandante}
    - Derecho vulnerado: ${derechoVulnerado}
    - Hechos: ${hechos}
    - Peticiones: ${peticiones}
    
    El documento debe incluir:
    1. Encabezado del tribunal
    2. Datos del demandante
    3. Fundamentos constitucionales
    4. Hechos expuestos
    5. Peticiones específicas
    
    Formato el documento como un escrito legal profesional.
    `;
        const openai = createOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "Eres un abogado especializado en derecho constitucional y acciones de tutela en Colombia. Genera documentos legales profesionales y precisos." },
                { role: "user", content: prompt }
            ],
            max_tokens: 2000,
        });
        // Save to Firestore
        const db = admin.firestore();
        const docRef = await db.collection("tutelas").add({
            nombreDemandante,
            derechoVulnerado,
            hechos,
            peticiones,
            documento: ((_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.json({
            success: true,
            documento: ((_d = (_c = completion.choices[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) || "",
            documentId: docRef.id,
        });
    }
    catch (error) {
        console.error("Error generating tutela:", error);
        res.status(500).json({
            success: false,
            error: "Failed to generate document",
        });
    }
});
// Get user statistics function
exports.getUserStats = onRequestWithCors(async (req, res) => {
    try {
        const db = admin.firestore();
        // Get counts from different collections
        const [reclamacionesSnapshot, tutelasSnapshot] = await Promise.all([
            db.collection("reclamaciones").get(),
            db.collection("tutelas").get(),
        ]);
        const stats = {
            totalReclamaciones: reclamacionesSnapshot.size,
            totalTutelas: tutelasSnapshot.size,
            totalDocuments: reclamacionesSnapshot.size + tutelasSnapshot.size,
        };
        res.json({
            success: true,
            stats,
        });
    }
    catch (error) {
        console.error("Error getting stats:", error);
        res.status(500).json({
            success: false,
            error: "Failed to get statistics",
        });
    }
});
// User Management Functions
exports.disableUser = onRequestWithCors(async (req, res) => {
    try {
        const { uid } = req.body;
        if (!uid) {
            return res.status(400).json({
                success: false,
                error: 'UID is required'
            });
        }
        functions.logger.info(`🔒 Disabling user in Firebase Auth: ${uid}`);
        // Disable user in Firebase Authentication
        await admin.auth().updateUser(uid, {
            disabled: true
        });
        functions.logger.info(`✅ User disabled in Firebase Auth: ${uid}`);
        res.json({
            success: true,
            message: 'User disabled successfully'
        });
    }
    catch (error) {
        functions.logger.error('❌ Error disabling user:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.enableUser = onRequestWithCors(async (req, res) => {
    try {
        const { uid } = req.body;
        if (!uid) {
            return res.status(400).json({
                success: false,
                error: 'UID is required'
            });
        }
        functions.logger.info(`🔓 Enabling user in Firebase Auth: ${uid}`);
        // Enable user in Firebase Authentication
        await admin.auth().updateUser(uid, {
            disabled: false
        });
        functions.logger.info(`✅ User enabled in Firebase Auth: ${uid}`);
        res.json({
            success: true,
            message: 'User enabled successfully'
        });
    }
    catch (error) {
        functions.logger.error('❌ Error enabling user:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.cleanupUser = onRequestWithCors(async (req, res) => {
    try {
        const { uid } = req.body;
        if (!uid) {
            return res.status(400).json({
                success: false,
                error: 'UID is required'
            });
        }
        functions.logger.info(`🧹 Cleaning up user data for: ${uid}`);
        const firestore = admin.firestore();
        const collections = [
            'reclamaciones',
            'tutelas',
            'legal_audits',
            'document_generation_history',
            'user_analytics',
            'email_reports',
            'purchase_history',
            'document_templates'
        ];
        let totalDeleted = 0;
        // Delete documents from all collections except 'users'
        for (const collectionName of collections) {
            try {
                const snapshot = await firestore
                    .collection(collectionName)
                    .where('userId', '==', uid)
                    .get();
                if (!snapshot.empty) {
                    const batch = firestore.batch();
                    snapshot.docs.forEach((doc) => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                    totalDeleted += snapshot.size;
                    functions.logger.info(`✅ Deleted ${snapshot.size} documents from ${collectionName}`);
                }
            }
            catch (collectionError) {
                functions.logger.error(`⚠️ Error cleaning collection ${collectionName}:`, collectionError);
                // Continue with other collections even if one fails
            }
        }
        functions.logger.info(`✅ User data cleanup completed. Total documents deleted: ${totalDeleted}`);
        res.json({
            success: true,
            message: `User data cleaned up successfully. ${totalDeleted} documents deleted.`,
            deletedCount: totalDeleted
        });
    }
    catch (error) {
        functions.logger.error('❌ Error cleaning up user data:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.updateUserStatus = onRequestWithCors(async (req, res) => {
    try {
        const { uid, isActive } = req.body;
        if (!uid || typeof isActive !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'UID and isActive boolean are required'
            });
        }
        functions.logger.info(`📝 Updating user status: ${uid} -> isActive: ${isActive}`);
        const firestore = admin.firestore();
        const userRef = firestore.collection('users').doc(uid);
        // Check if user document exists
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            // Create user document if it doesn't exist
            functions.logger.info(`📝 Creating user document for: ${uid}`);
            // Get user info from Firebase Auth
            let userData = {
                uid: uid,
                isActive: isActive,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                statusUpdatedAt: new Date().toISOString()
            };
            try {
                const authUser = await admin.auth().getUser(uid);
                if (authUser.email)
                    userData.email = authUser.email;
                if (authUser.displayName)
                    userData.displayName = authUser.displayName;
                if (authUser.emailVerified !== undefined)
                    userData.emailVerified = authUser.emailVerified;
            }
            catch (authError) {
                functions.logger.warn(`⚠️ Could not get auth user data for ${uid}:`, authError);
            }
            await userRef.set(userData);
            functions.logger.info(`✅ User document created successfully: ${uid}`);
        }
        else {
            // Update existing user document
            await userRef.update({
                isActive: isActive,
                updatedAt: new Date().toISOString(),
                statusUpdatedAt: new Date().toISOString()
            });
            functions.logger.info(`✅ User status updated successfully: ${uid}`);
        }
        res.json({
            success: true,
            message: `User status updated to ${isActive ? 'active' : 'inactive'}`
        });
    }
    catch (error) {
        functions.logger.error('❌ Error updating user status:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.checkUserStatusByEmail = onRequestWithCors(async (req, res) => {
    try {
        const email = req.query.email;
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }
        functions.logger.info(`🔍 Checking user status for email: ${email}`);
        // Get user by email from Firebase Auth
        const userRecord = await admin.auth().getUserByEmail(email);
        if (!userRecord) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        const uid = userRecord.uid;
        // Check user document in Firestore
        const firestore = admin.firestore();
        const userRef = firestore.collection('users').doc(uid);
        const userDoc = await userRef.get();
        let isActive = true; // Default to active
        if (userDoc.exists) {
            const userData = userDoc.data();
            isActive = (userData === null || userData === void 0 ? void 0 : userData.isActive) !== false;
        }
        else {
            // If user document doesn't exist, create it
            functions.logger.info(`📝 Creating user document for: ${uid}`);
            let userData = {
                uid: uid,
                email: userRecord.email,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            if (userRecord.displayName)
                userData.displayName = userRecord.displayName;
            if (userRecord.emailVerified !== undefined)
                userData.emailVerified = userRecord.emailVerified;
            await userRef.set(userData);
            functions.logger.info(`✅ User document created successfully: ${uid}`);
        }
        functions.logger.info(`✅ User status checked: ${email} -> isActive: ${isActive}`);
        res.json({
            success: true,
            uid: uid,
            isActive: isActive,
            email: userRecord.email,
            displayName: userRecord.displayName
        });
    }
    catch (error) {
        functions.logger.error('❌ Error checking user status:', error);
        if (error.code === 'auth/user-not-found') {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.reactivateUser = onRequestWithCors(async (req, res) => {
    try {
        const { uid } = req.body;
        if (!uid) {
            return res.status(400).json({
                success: false,
                error: 'UID is required'
            });
        }
        functions.logger.info(`🔄 Reactivating user account: ${uid}`);
        // Enable user in Firebase Authentication
        await admin.auth().updateUser(uid, {
            disabled: false
        });
        functions.logger.info(`✅ User enabled in Firebase Auth: ${uid}`);
        // Update user status in Firestore
        const firestore = admin.firestore();
        const userRef = firestore.collection('users').doc(uid);
        // Check if user document exists
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            // Create user document if it doesn't exist
            functions.logger.info(`📝 Creating user document for reactivated user: ${uid}`);
            // Get user info from Firebase Auth
            const authUser = await admin.auth().getUser(uid);
            let userData = {
                uid: uid,
                email: authUser.email,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                reactivatedAt: new Date().toISOString()
            };
            if (authUser.displayName)
                userData.displayName = authUser.displayName;
            if (authUser.emailVerified !== undefined)
                userData.emailVerified = authUser.emailVerified;
            await userRef.set(userData);
            functions.logger.info(`✅ User document created for reactivated user: ${uid}`);
        }
        else {
            // Update existing user document
            await userRef.update({
                isActive: true,
                updatedAt: new Date().toISOString(),
                reactivatedAt: new Date().toISOString()
            });
            functions.logger.info(`✅ User status updated to active: ${uid}`);
        }
        functions.logger.info(`✅ User account reactivated successfully: ${uid}`);
        res.json({
            success: true,
            message: 'Account reactivated successfully'
        });
    }
    catch (error) {
        functions.logger.error('❌ Error reactivating user account:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.getUserStatus = onRequestWithCors(async (req, res) => {
    try {
        const uid = req.query.uid;
        if (!uid) {
            return res.status(400).json({
                success: false,
                error: 'UID is required'
            });
        }
        functions.logger.info(`🔍 Checking user status: ${uid}`);
        const firestore = admin.firestore();
        const userRef = firestore.collection('users').doc(uid);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            // Create user document if it doesn't exist
            functions.logger.info(`📝 Creating user document for: ${uid}`);
            // Get user info from Firebase Auth
            let userData = {
                uid: uid,
                isActive: true, // Default to active for new users
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            try {
                const authUser = await admin.auth().getUser(uid);
                if (authUser.email)
                    userData.email = authUser.email;
                if (authUser.displayName)
                    userData.displayName = authUser.displayName;
                if (authUser.emailVerified !== undefined)
                    userData.emailVerified = authUser.emailVerified;
            }
            catch (authError) {
                functions.logger.warn(`⚠️ Could not get auth user data for ${uid}:`, authError);
            }
            await userRef.set(userData);
            functions.logger.info(`✅ User document created successfully: ${uid}`);
            // Return the newly created user data
            res.json({
                success: true,
                isActive: true,
                userData: {
                    email: userData.email,
                    displayName: userData.displayName,
                    isActive: true,
                    createdAt: userData.createdAt,
                    updatedAt: userData.updatedAt
                }
            });
        }
        else {
            const userData = userDoc.data();
            const isActive = (userData === null || userData === void 0 ? void 0 : userData.isActive) !== false; // Default to true if not set
            functions.logger.info(`✅ User status retrieved: ${uid} -> isActive: ${isActive}`);
            res.json({
                success: true,
                isActive: isActive,
                userData: {
                    email: userData === null || userData === void 0 ? void 0 : userData.email,
                    displayName: userData === null || userData === void 0 ? void 0 : userData.displayName,
                    isActive: isActive,
                    createdAt: userData === null || userData === void 0 ? void 0 : userData.createdAt,
                    updatedAt: userData === null || userData === void 0 ? void 0 : userData.updatedAt
                }
            });
        }
    }
    catch (error) {
        functions.logger.error('❌ Error checking user status:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// ⭐ NUEVO: Analyze Documents Endpoint - Upload PDFs and extract text
exports.analyzeDocuments = onRequestWithCors(async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        const bucket = admin.storage().bucket();
        const uploadedFiles = [];
        let userId = null;
        let tutelaId = null;
        let reclId = null;
        return new Promise((resolve, reject) => {
            const bb = (0, busboy_1.default)({ headers: req.headers });
            const filePromises = [];
            bb.on('field', (name, value) => {
                if (name === 'userId')
                    userId = value;
                if (name === 'tutelaId')
                    tutelaId = value;
                if (name === 'reclId')
                    reclId = value;
            });
            bb.on('file', (name, file, info) => {
                const { filename, encoding, mimeType } = info;
                if (mimeType !== 'application/pdf') {
                    file.resume(); // Skip non-PDF files
                    return;
                }
                if (!userId) {
                    file.resume();
                    return;
                }
                // UID-first hierarchy: {uid}/autoservicio/{documentType}/ocr/{documentId}/uploads/...
                const docType = tutelaId ? "accion-tutela" : "reclamacion-cantidades";
                const documentId = tutelaId || reclId || `DOC_${Date.now()}`;
                const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
                const sanitizedFileName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
                const storagePath = buildStoragePath(userId, "autoservicio", docType, "ocr", documentId, "uploads", `${timestamp}_${sanitizedFileName}`);
                const chunks = [];
                file.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                const filePromise = new Promise((fileResolve, fileReject) => {
                    file.on('end', async () => {
                        try {
                            const fileBuffer = Buffer.concat(chunks);
                            const token = (0, uuid_1.v4)();
                            // Upload to Storage
                            await bucket.file(storagePath).save(fileBuffer, {
                                resumable: false,
                                metadata: {
                                    contentType: 'application/pdf',
                                    cacheControl: 'public, max-age=3600',
                                    metadata: {
                                        firebaseStorageDownloadTokens: token,
                                        originalName: filename,
                                        uploadedAt: new Date().toISOString(),
                                        userId,
                                        documentType: tutelaId ? 'tutelas' : 'reclamaciones',
                                        documentId,
                                    },
                                },
                            });
                            const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
                            // Extract text from PDF
                            let extractedText;
                            try {
                                const pdfData = await (0, pdf_parse_1.default)(fileBuffer);
                                extractedText = pdfData.text;
                                console.log(`✅ Text extracted from ${filename}: ${extractedText.length} characters`);
                            }
                            catch (parseError) {
                                console.warn(`⚠️ Could not extract text from ${filename}:`, parseError);
                                extractedText = undefined;
                            }
                            uploadedFiles.push({
                                fileName: filename,
                                storagePath,
                                downloadUrl,
                                extractedText,
                                size: fileBuffer.length,
                            });
                            fileResolve();
                        }
                        catch (error) {
                            console.error(`❌ Error processing file ${filename}:`, error);
                            fileReject(error);
                        }
                    });
                    file.on('error', (error) => {
                        console.error(`❌ Error reading file ${filename}:`, error);
                        fileReject(error);
                    });
                });
                filePromises.push(filePromise);
            });
            bb.on('finish', async () => {
                try {
                    await Promise.all(filePromises);
                    // Store uploaded files metadata in Firestore
                    if (userId && uploadedFiles.length > 0) {
                        const firestore = admin.firestore();
                        const documentType = tutelaId ? 'tutelas' : 'reclamaciones';
                        const documentId = tutelaId || reclId;
                        if (documentId) {
                            const metadataRef = firestore
                                .collection('document_uploads')
                                .doc();
                            await metadataRef.set({
                                userId,
                                documentType,
                                documentId,
                                uploadedFiles: uploadedFiles.map(f => {
                                    var _a;
                                    return ({
                                        fileName: f.fileName,
                                        storagePath: f.storagePath,
                                        downloadUrl: f.downloadUrl,
                                        size: f.size,
                                        extractedText: f.extractedText || null, // Store extracted text
                                        extractedTextLength: ((_a = f.extractedText) === null || _a === void 0 ? void 0 : _a.length) || 0,
                                    });
                                }),
                                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            });
                        }
                    }
                    res.json({
                        success: true,
                        data: {
                            uploadedFiles,
                            count: uploadedFiles.length,
                        },
                    });
                    resolve();
                }
                catch (error) {
                    console.error('❌ Error in analyzeDocuments finish handler:', error);
                    res.status(500).json({
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                    reject(error);
                }
            });
            bb.on('error', (error) => {
                console.error('❌ Busboy error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Error parsing multipart form data',
                });
                reject(error);
            });
            // Pipe request to busboy
            req.pipe(bb);
        });
    }
    catch (error) {
        console.error('❌ Error in analyzeDocuments:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
// =============================
// Stripe Functions
// =============================
// Create Stripe Checkout Session
exports.createCheckoutSession = onRequestWithCorsAndSecrets({
    secrets: stripeSecretKey ? [
        stripeSecretKey,
        ...(stripePriceIdTutela ? [stripePriceIdTutela] : [])
    ] : []
}, async (req, res) => {
    var _a;
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        const secretKey = resolveStripeSecretKey();
        console.log('Secret key length:', secretKey.length);
        console.log('Secret key starts with:', secretKey.substring(0, 10));
        console.log('Secret key ends with:', secretKey.substring(secretKey.length - 10));
        // Validate the secret key format
        if (!secretKey.startsWith('sk_')) {
            console.error('Invalid Stripe secret key format');
            return res.status(500).json({
                success: false,
                error: 'Invalid Stripe configuration'
            });
        }
        const stripe = new stripe_1.default(secretKey, { apiVersion: "2023-10-16" });
        const { items, customerEmail, successUrl, cancelUrl, userId, documentType, docId, tutelaId, formData, subscriptionPlan, priceId, } = req.body;
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Missing or invalid userId'
            });
        }
        // Subscription mode: Abogados or Autoservicio plans with Stripe price ID
        if (subscriptionPlan && priceId && typeof priceId === 'string') {
            // Pilot users: skip Stripe completely and mark subscription as active
            if (customerEmail && (0, pilot_users_1.isPilotUser)(customerEmail)) {
                const firestore = admin.firestore();
                const userRef = firestore.collection('users').doc(userId);
                try {
                    await userRef.set({
                        role: 'pilot',
                        subscription: {
                            plan: 'premium',
                            isActive: true,
                            startDate: admin.firestore.FieldValue.serverTimestamp(),
                        },
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });
                    functions.logger.info('Pilot user subscription auto-activated', {
                        userId,
                        customerEmail,
                        subscriptionPlan,
                    });
                }
                catch (error) {
                    functions.logger.error('Failed to auto-activate subscription for pilot user', { userId, customerEmail, error });
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to activate pilot subscription',
                    });
                }
                const redirectUrl = successUrl || `${req.headers.origin || ''}/dashboard`;
                return res.json({
                    success: true,
                    url: redirectUrl,
                    pilot: true,
                });
            }
            functions.logger.info('Creating subscription checkout session', {
                subscriptionPlan,
                priceId,
                userId,
                customerEmail,
            });
            const session = await stripe.checkout.sessions.create({
                mode: 'subscription',
                payment_method_types: ['card'],
                line_items: [{ price: priceId, quantity: 1 }],
                customer_email: customerEmail || undefined,
                success_url: successUrl || `${req.headers.origin || ''}/dashboard`,
                cancel_url: cancelUrl || `${req.headers.origin || ''}/signup`,
                metadata: {
                    userId,
                    planType: subscriptionPlan,
                },
            });
            return res.json({
                success: true,
                url: session.url,
                sessionId: session.id,
            });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No items provided'
            });
        }
        console.log('Creating checkout session with items:', items);
        const firestore = admin.firestore();
        const orderRef = firestore.collection('purchases').doc();
        const orderId = orderRef.id;
        const totalCents = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
        // ⭐ NUEVO: Determinar moneda según documentType o country del item
        // Priorizar country del primer item si está disponible, sino usar documentType
        let currency = 'eur'; // default
        if (items && items.length > 0 && items[0].country) {
            currency = items[0].country === 'Colombia' ? 'cop' : 'eur';
        }
        else {
            currency = documentType === 'accion_tutela' ? 'cop' : 'eur';
        }
        // Asegurar que currency sea exactamente 'cop' o 'eur' (lowercase)
        currency = currency.toLowerCase() === 'cop' ? 'cop' : 'eur';
        const isCOP = currency === 'cop';
        console.log('Currency determination:', {
            documentType,
            firstItemCountry: (_a = items === null || items === void 0 ? void 0 : items[0]) === null || _a === void 0 ? void 0 : _a.country,
            determinedCurrency: currency,
            isCOP,
            rawItems: items
        });
        // Para COP, el precio ya está en la unidad mínima (no hay centavos)
        // Para EUR, el precio debe estar en centavos
        const normalizedItems = items.map((item) => {
            var _a;
            return ({
                name: String((_a = item.name) !== null && _a !== void 0 ? _a : 'Documento legal'),
                area: item.area ? String(item.area) : undefined,
                country: item.country ? String(item.country) : DEFAULT_STUDENT_COUNTRY,
                priceCents: isCOP ? Number(item.price || 0) : Number(item.price || 0), // Para COP, ya está en la unidad mínima
                price: isCOP ? Number(item.price || 0) : Number(item.price || 0) / 100, // Para EUR, convertir de centavos
                quantity: Number(item.quantity || 1),
            });
        });
        // Pilot users for estudiantes: generar materiales sin pasar por Stripe
        if (documentType === 'estudiantes' && customerEmail && (0, pilot_users_1.isPilotUser)(customerEmail)) {
            try {
                const first = normalizedItems[0];
                const areaLegal = first.area || 'General';
                const tipoEscrito = first.name || 'Documento legal';
                const pais = first.country || DEFAULT_STUDENT_COUNTRY;
                functions.logger.info('Pilot student purchase detected, generating package without Stripe', {
                    userId,
                    customerEmail,
                    areaLegal,
                    tipoEscrito,
                    pais,
                });
                const packageResult = await generateStudentDocumentPackageCore({
                    userId,
                    userEmail: customerEmail,
                    areaLegal,
                    tipoEscrito,
                    pais,
                });
                const purchaseData = {
                    userId,
                    customerEmail,
                    status: 'completed',
                    currency: currency.toUpperCase(),
                    documentType: 'estudiantes',
                    source: 'pilot',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    totalCents,
                    total: isCOP ? totalCents : totalCents / 100,
                    items: normalizedItems.map((item, index) => ({
                        id: `${orderId}-item-${index}`,
                        name: item.name,
                        area: item.area,
                        country: item.country,
                        price: item.price,
                        quantity: item.quantity,
                        status: 'completed',
                        documentType: 'estudiantes',
                        packageFiles: index === 0 ? packageResult.files : undefined,
                    })),
                };
                await orderRef.set(purchaseData);
                functions.logger.info('Pilot student purchase stored in Firestore', {
                    orderId,
                    userId,
                });
                const redirectUrl = successUrl || `${req.headers.origin || ''}/dashboard/estudiantes?payment=success`;
                return res.json({
                    success: true,
                    url: redirectUrl,
                    pilot: true,
                    orderId,
                });
            }
            catch (error) {
                functions.logger.error('Failed to generate student package for pilot user without Stripe', { userId, customerEmail, error });
                return res.status(500).json({
                    success: false,
                    error: 'Failed to generate student package for pilot user',
                });
            }
        }
        await orderRef.set({
            userId,
            customerEmail: customerEmail || null,
            status: 'pending',
            currency: currency.toUpperCase(),
            items: normalizedItems,
            totalCents: isCOP ? totalCents : totalCents, // Para COP, ya está en la unidad mínima
            total: isCOP ? totalCents : totalCents / 100, // Para EUR, convertir de centavos
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            metadata: {
                successUrl,
                cancelUrl,
            },
        });
        // ⭐ NUEVO: Guardar formData en Firestore antes del pago (para accion_tutela)
        // Esto evita exceder los límites de Stripe metadata (500 caracteres por key)
        if (documentType === 'accion_tutela' && formData && docId && tutelaId) {
            try {
                const metadataRef = firestore.collection('payment_metadata').doc(`${userId}_${Date.now()}`);
                await metadataRef.set({
                    userId: userId,
                    documentType: 'accion_tutela',
                    docId: docId,
                    tutelaId: tutelaId,
                    formData: formData,
                    customerEmail: customerEmail,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                console.log('✅ Metadata de tutela guardada en Firestore');
            }
            catch (error) {
                console.warn('⚠️ Error guardando metadata de tutela en Firestore:', error);
                // No lanzar error aquí para no bloquear el flujo de pago
            }
        }
        // Create line items for Stripe checkout
        // Para accion_tutela con COP, intentar usar Price ID si está disponible
        let lineItems = [];
        let tutelaPriceId; // Declarar fuera del bloque para usar en validación
        if (documentType === 'accion_tutela' && isCOP) {
            // Intentar usar Price ID desde secret o variable de entorno
            // Try secret first
            if (stripePriceIdTutela) {
                try {
                    tutelaPriceId = stripePriceIdTutela.value();
                    console.log('✅ Using STRIPE_PRICE_ID_TUTELA from secret:', tutelaPriceId);
                }
                catch (error) {
                    console.warn('⚠️ STRIPE_PRICE_ID_TUTELA secret not available, trying environment variable');
                }
            }
            // Fallback to environment variable
            if (!tutelaPriceId) {
                tutelaPriceId = process.env.STRIPE_PRICE_ID_TUTELA;
                if (tutelaPriceId) {
                    console.log('✅ Using STRIPE_PRICE_ID_TUTELA from environment variable:', tutelaPriceId);
                }
            }
            if (tutelaPriceId) {
                console.log('Using Stripe Price ID for tutela:', tutelaPriceId);
                lineItems = items.map((item) => ({
                    price: tutelaPriceId,
                    quantity: Number(item.quantity || 1),
                }));
            }
            else {
                console.log('⚠️ STRIPE_PRICE_ID_TUTELA not set, using price_data (may cause currency issues)');
                // Fallback a price_data si no hay Price ID
                lineItems = items.map((item) => {
                    const rawPrice = Number(item.price || 0);
                    const unitAmount = Math.round(Math.abs(rawPrice));
                    console.log('Creating line item with price_data:', {
                        name: item.name,
                        currency: currency.toLowerCase(),
                        unitAmount: unitAmount,
                        originalPrice: item.price,
                        priceType: typeof item.price,
                        quantity: item.quantity,
                        country: item.country,
                    });
                    return {
                        price_data: {
                            currency: currency.toLowerCase(), // 'cop'
                            product_data: {
                                name: item.name || 'Documento legal',
                                description: `Área: ${item.area || ''}`,
                            },
                            unit_amount: unitAmount,
                        },
                        quantity: Number(item.quantity || 1),
                    };
                });
            }
        }
        else {
            // Para otros tipos (estudiantes, reclamacion), usar price_data normal
            lineItems = items.map((item) => {
                const rawPrice = Number(item.price || 0);
                const unitAmount = Math.round(Math.abs(rawPrice));
                const minAmount = isCOP ? 1 : 50;
                if (unitAmount < minAmount) {
                    throw new Error(`El monto mínimo para ${currency.toUpperCase()} es ${isCOP ? '1 peso' : '50 centavos'}. Monto recibido: ${unitAmount}`);
                }
                console.log('Creating line item:', {
                    name: item.name,
                    currency: currency.toLowerCase(),
                    unitAmount: unitAmount,
                    originalPrice: item.price,
                    priceType: typeof item.price,
                    quantity: item.quantity,
                    country: item.country,
                    totalAmount: unitAmount * Number(item.quantity || 1)
                });
                return {
                    price_data: {
                        currency: currency.toLowerCase(),
                        product_data: {
                            name: item.name || 'Documento legal',
                            description: `Área: ${item.area || ''}`,
                        },
                        unit_amount: unitAmount,
                    },
                    quantity: Number(item.quantity || 1),
                };
            });
        }
        // Validar que lineItems no esté vacío
        if (!lineItems || lineItems.length === 0) {
            console.error('❌ Error: lineItems está vacío', { documentType, items });
            return res.status(400).json({
                success: false,
                error: 'No se pudieron crear los items de pago. Por favor, verifica los datos.'
            });
        }
        // Preparar metadata para Stripe (sin formData para evitar límites)
        const stripeMetadata = {
            items: JSON.stringify(items),
            totalItems: items.reduce((sum, item) => sum + item.quantity, 0).toString(),
            orderId,
            userId,
            documentType: documentType || 'estudiantes',
        };
        // Agregar campos específicos de tutela (sin formData)
        if (documentType === 'accion_tutela') {
            if (docId)
                stripeMetadata.docId = docId;
            if (tutelaId)
                stripeMetadata.tutelaId = tutelaId;
            // formData se guarda en Firestore, no en Stripe metadata
        }
        // Log exact data being sent to Stripe
        console.log('Creating Stripe checkout session with:', {
            currency: currency,
            lineItems: lineItems.map(li => {
                var _a, _b, _c, _d, _e;
                return ({
                    currency: (_a = li.price_data) === null || _a === void 0 ? void 0 : _a.currency,
                    unit_amount: (_b = li.price_data) === null || _b === void 0 ? void 0 : _b.unit_amount,
                    quantity: li.quantity,
                    name: (_d = (_c = li.price_data) === null || _c === void 0 ? void 0 : _c.product_data) === null || _d === void 0 ? void 0 : _d.name,
                    total: (((_e = li.price_data) === null || _e === void 0 ? void 0 : _e.unit_amount) || 0) * (li.quantity || 1)
                });
            }),
            customerEmail,
            metadata: stripeMetadata
        });
        // Validar que todos los line items tengan currency 'cop' si es accion_tutela
        // NOTA: Si estamos usando Price ID, no hay price_data (solo price field), así que saltamos la validación
        if (documentType === 'accion_tutela' && !tutelaPriceId) {
            // Solo validar currency si estamos usando price_data (no Price ID)
            const invalidItems = lineItems.filter(li => {
                // Si tiene price_data, validar currency. Si tiene price (Price ID), no validar.
                return li.price_data && li.price_data.currency !== 'cop';
            });
            if (invalidItems.length > 0) {
                console.error('❌ Error: Line items con currency incorrecta para accion_tutela:', invalidItems);
                return res.status(400).json({
                    success: false,
                    error: `Error de configuración: Los items deben tener currency 'cop' para acción de tutela`
                });
            }
        }
        // Log the exact structure being sent to Stripe API
        const stripeRequestPayload = {
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            customer_email: customerEmail,
            success_url: successUrl,
            cancel_url: cancelUrl,
            client_reference_id: orderId,
            metadata: stripeMetadata,
        };
        console.log('🔍 EXACT Stripe API request payload:', JSON.stringify(stripeRequestPayload, null, 2));
        console.log('🔍 Line items detail:', JSON.stringify(lineItems, null, 2));
        const session = await stripe.checkout.sessions.create(stripeRequestPayload);
        console.log('Checkout session created successfully:', session.id);
        await orderRef.set({
            stripe: {
                sessionId: session.id,
                url: session.url,
            }
        }, { merge: true });
        res.json({
            success: true,
            url: session.url,
            sessionId: session.id,
            orderId
        });
    }
    catch (error) {
        console.error('❌ Error creating checkout session:', error);
        console.error('❌ Error details:', {
            message: error.message,
            type: error.type,
            code: error.code,
            statusCode: error.statusCode,
            raw: error.raw ? JSON.stringify(error.raw, null, 2) : 'N/A'
        });
        // Log the request that failed
        if (error.request) {
            console.error('❌ Failed request details:', {
                method: error.request.method,
                path: error.request.path,
                headers: error.request.headers,
                body: error.request.body ? JSON.stringify(error.request.body, null, 2) : 'N/A'
            });
        }
        // Proporcionar mensaje de error más específico
        let errorMessage = 'Error creating checkout session';
        if (error.type === 'StripeInvalidRequestError') {
            errorMessage = `Error de validación de Stripe: ${error.message}`;
        }
        else if (error.message) {
            errorMessage = error.message;
        }
        res.status(500).json({
            success: false,
            error: errorMessage
        });
    }
});
// =============================
// Student Document Generation
// =============================
const runChatCompletion = async (openai, messages, maxTokens) => {
    var _a, _b, _c, _d, _e;
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        max_tokens: maxTokens,
        temperature: 0.2,
    });
    return {
        text: ((_c = (_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) || "",
        tokens: (_e = (_d = completion.usage) === null || _d === void 0 ? void 0 : _d.total_tokens) !== null && _e !== void 0 ? _e : null,
        model: completion.model,
    };
};
const generateStudentDocumentPackageCore = async ({ userId, userEmail, areaLegal, tipoEscrito, pais, openai: providedOpenAI, }) => {
    if (!userId || !areaLegal || !tipoEscrito || !pais) {
        throw new Error("Missing required fields for student document generation.");
    }
    const openai = providedOpenAI !== null && providedOpenAI !== void 0 ? providedOpenAI : createOpenAIClient();
    const jurisdictionLine = `Área Legal: ${areaLegal}\nTipo de Escrito: ${tipoEscrito}\nJurisdicción / País objetivo: ${pais}`;
    // PARALLELIZE OpenAI calls - they don't depend on each other
    // This reduces generation time from ~10 minutes to ~3-4 minutes
    console.log('🚀 Starting parallel OpenAI API calls...');
    const [templateResult, sampleResult, studyResult] = await Promise.all([
        runChatCompletion(openai, [
            {
                role: "system",
                content: "Eres un abogado senior especializado en formación universitaria. Elaboras plantillas jurídicas exhaustivas, impecables y listas para personalizar.",
            },
            {
                role: "user",
                content: `${jurisdictionLine}\n\nGenera una PLANTILLA EXTENSA del documento solicitado. Incluye:\n- Encabezados formales y campos personalizables entre corchetes\n- Secciones numeradas con instrucciones precisas\n- Comentarios guía para el estudiante dentro de notas aclaratorias\n- Referencias a legislación aplicable (${pais}) y jurisprudencia orientativa\n- Recomendaciones de anexos y evidencias a adjuntar\n\nLa extensión mínima esperada es de 1.500 palabras con todo el detalle necesario.`,
            },
        ], 4000),
        runChatCompletion(openai, [
            {
                role: "system",
                content: "Actúas como abogado tutor. Redactas ejemplos completos con información ficticia verosímil para guiar a estudiantes de derecho.",
            },
            {
                role: "user",
                content: `${jurisdictionLine}\n\nGenera un EJEMPLO EXTENSO del documento ya diligenciado con datos simulados:\n- Crea nombres de partes, hechos y cronología coherente\n- Desarrolla fundamentos de derecho sólidos con citas normativas (${pais})\n- Incluye anexos, peticiones y firmas\n- Añade comentarios laterales para explicar cada sección al estudiante\n\nBusca un texto de más de 1.500 palabras que ilustre el documento completo.`,
            },
        ], 4200),
        runChatCompletion(openai, [
            {
                role: "system",
                content: "Eres catedrático universitario de derecho. Elaboras guías académicas profundas, estructuradas y listas para estudio.",
            },
            {
                role: "user",
                content: `${jurisdictionLine}\n\nPrepara un DOSSIER ACADÉMICO mínimo de 2.000 palabras (equivalente a 3 páginas o más) que incluya:\n1. Contexto jurídico y finalidad del documento\n2. Marco normativo (${pais}) y jurisprudencia relevante\n3. Pasos administrativos o judiciales, instituciones y plazos\n4. Checklist de requisitos y documentación soporte\n5. Errores frecuentes y buenas prácticas\n6. Bibliografía recomendada y recursos académicos\n\nOrganiza el contenido en secciones claras con títulos y subtítulos.`,
            },
        ], 4500),
    ]);
    console.log('✅ All OpenAI API calls completed in parallel');
    const areaSlug = slugify(areaLegal);
    const documentSlug = slugify(tipoEscrito);
    const countrySlug = slugify(pais);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const basePath = buildStoragePath(userId, "estudiante", "documentos", "documents", areaSlug, documentSlug, countrySlug, timestamp);
    // PARALLELIZE document generation - PDF and DOCX can be generated simultaneously
    console.log('📄 Starting parallel document generation (PDF/DOCX)...');
    const [templateDocx, templatePdf, sampleDocx, samplePdf, studyPdf] = await Promise.all([
        createDocxBuffer({
            title: `Plantilla profesional: ${tipoEscrito}`,
            subtitle: `${areaLegal} • ${pais}`,
            body: templateResult.text,
        }),
        createPdfBuffer({
            title: `Plantilla profesional: ${tipoEscrito}`,
            subtitle: `${areaLegal} • ${pais}`,
            body: templateResult.text,
        }),
        createDocxBuffer({
            title: `Ejemplo completo: ${tipoEscrito}`,
            subtitle: `Caso académico simulado • ${pais}`,
            body: sampleResult.text,
        }),
        createPdfBuffer({
            title: `Ejemplo completo: ${tipoEscrito}`,
            subtitle: `Caso académico simulado • ${pais}`,
            body: sampleResult.text,
        }),
        createPdfBuffer({
            title: `Dossier académico: ${tipoEscrito}`,
            subtitle: `Guía universitaria integral • ${pais}`,
            body: studyResult.text,
            footerNote: "Guía académica Avocat LegalTech - Mínimo 3 páginas de contenido formativo",
        }),
    ]);
    console.log('✅ All documents generated in parallel');
    const [templateDocxUpload, templatePdfUpload, sampleDocxUpload, samplePdfUpload, studyPdfUpload,] = await Promise.all([
        uploadToStorage(templateDocx, `${basePath}/plantilla/plantilla-${documentSlug}.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        uploadToStorage(templatePdf, `${basePath}/plantilla/plantilla-${documentSlug}.pdf`, "application/pdf"),
        uploadToStorage(sampleDocx, `${basePath}/ejemplo/ejemplo-${documentSlug}.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        uploadToStorage(samplePdf, `${basePath}/ejemplo/ejemplo-${documentSlug}.pdf`, "application/pdf"),
        uploadToStorage(studyPdf, `${basePath}/estudio/dossier-${documentSlug}.pdf`, "application/pdf"),
    ]);
    const firestore = admin.firestore();
    const packageRef = firestore.collection("student_document_packages").doc();
    await packageRef.set({
        userId,
        userEmail: userEmail || null,
        areaLegal,
        tipoEscrito,
        pais,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "generated",
        storageBasePath: basePath,
        outputs: {
            template: {
                text: templateResult.text,
                docx: templateDocxUpload,
                pdf: templatePdfUpload,
            },
            sample: {
                text: sampleResult.text,
                docx: sampleDocxUpload,
                pdf: samplePdfUpload,
            },
            studyMaterial: {
                text: studyResult.text,
                pdf: studyPdfUpload,
            },
        },
        openai: {
            template: {
                model: templateResult.model,
                tokens: templateResult.tokens,
            },
            sample: {
                model: sampleResult.model,
                tokens: sampleResult.tokens,
            },
            studyMaterial: {
                model: studyResult.model,
                tokens: studyResult.tokens,
            },
        },
    });
    return {
        packageId: packageRef.id,
        storageBasePath: basePath,
        files: {
            templateDocx: templateDocxUpload,
            templatePdf: templatePdfUpload,
            sampleDocx: sampleDocxUpload,
            samplePdf: samplePdfUpload,
            studyMaterialPdf: studyPdfUpload,
        },
    };
};
exports.generateStudentDocumentPackage = onRequestWithCors(async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).json({ success: false, error: "Method not allowed" });
        return;
    }
    try {
        const { userId, userEmail, areaLegal, tipoEscrito, pais } = req.body || {};
        if (!userId || !areaLegal || !tipoEscrito || !pais) {
            res.status(400).json({
                success: false,
                error: "Missing required fields",
            });
            return;
        }
        const result = await generateStudentDocumentPackageCore({
            userId,
            userEmail,
            areaLegal,
            tipoEscrito,
            pais,
        });
        res.json({
            success: true,
            packageId: result.packageId,
            storageBasePath: result.storageBasePath,
            files: result.files,
        });
    }
    catch (error) {
        console.error("Error generating student document package:", error);
        res.status(500).json({
            success: false,
            error: "Failed to generate student document package",
        });
    }
});
// DISABLED: This function was creating purchases prematurely before payment completion
// Purchases are now handled exclusively by the stripeWebhook Cloud Function after successful payment
/*
export const autoGenerateStudentDocumentsOnPurchase = v1Firestore
  .document("purchases/{purchaseId}")
  .onWrite(async (change, context) => {
    const afterData = change.after.exists ? (change.after.data() as any) : null;

    if (!afterData) {
      return;
    }

    const purchaseId = context.params.purchaseId;
    const status = afterData.status || "pending";
    const userId = afterData.userId as string | undefined;
    const userEmail =
      afterData.customerEmail ||
      afterData.userEmail ||
      afterData.stripe?.customer_email ||
      null;

    if (status !== "completed") {
      return;
    }

    if (afterData.documentsGenerationStatus === "processing") {
      functions.logger.debug("Generation already in progress for purchase", purchaseId);
      return;
    }

    if (afterData.documentsGenerated && Array.isArray(afterData.documents) && afterData.documents.length > 0) {
      functions.logger.debug("Documents already generated for purchase", purchaseId);
      return;
    }

    const items = Array.isArray(afterData.items) ? afterData.items : [];
    if (!userId || items.length === 0) {
      functions.logger.warn(
        "Cannot auto-generate student documents: missing user or items",
        purchaseId,
        { userId, itemsLength: items.length }
      );
      return;
    }

    try {
      await change.after.ref.set(
        {
          documentsGenerationStatus: "processing",
          documentsGenerationRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      functions.logger.error("Failed to mark purchase as processing", purchaseId, error);
      return;
    }

    const existingDocuments = Array.isArray(afterData.documents) ? afterData.documents : [];
    const processedItemIds = new Set(
      existingDocuments
        .map((doc: any) => doc.itemId || doc.id)
        .filter((value: any) => typeof value === "string")
    );

    const openai = createOpenAIClient();
    const generatedDocuments: any[] = [];
    const errors: any[] = [];

    for (let index = 0; index < items.length; index++) {
      const item = items[index] || {};
      const itemId =
        item.id ||
        item.documentId ||
        `${purchaseId}-item-${index}`;

      if (processedItemIds.has(itemId)) {
        continue;
      }

      const areaLegal = item.area || item.category || item.legalArea || "General";
      const tipoEscrito = item.name || item.title || item.documentTitle;
      const country = item.country || afterData.country || DEFAULT_STUDENT_COUNTRY;

      if (!tipoEscrito) {
        errors.push({
          itemId,
          message: "Missing document name",
        });
        continue;
      }

      try {
        const generation = await generateStudentDocumentPackageCore({
          userId,
          userEmail,
          areaLegal,
          tipoEscrito,
          pais: country,
          openai,
        });

        generatedDocuments.push({
          itemId,
          id: generation.packageId,
          packageId: generation.packageId,
          name: tipoEscrito,
          area: areaLegal,
          country,
          quantity: Number(item.quantity || 1),
          price:
            typeof item.price === "number"
              ? item.price
              : typeof item.priceCents === "number"
              ? item.priceCents / 100
              : 0,
          downloadUrl: generation.files.studyMaterialPdf?.downloadUrl || null,
          storagePath: generation.files.studyMaterialPdf?.path || null,
          fileType: generation.files.studyMaterialPdf?.contentType || "application/pdf",
          packageFiles: generation.files,
          generatedAt: admin.firestore.Timestamp.now(),
        });
      } catch (error: any) {
        functions.logger.error(
          "Error auto-generating document for purchase",
          purchaseId,
          itemId,
          error
        );
        errors.push({
          itemId,
          name: tipoEscrito,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const mergedDocuments = (() => {
      if (generatedDocuments.length === 0) {
        return existingDocuments;
      }

      const generatedIds = new Set(generatedDocuments.map((doc) => doc.itemId));
      const preserved = existingDocuments.filter(
        (doc: any) => !generatedIds.has(doc.itemId || doc.id)
      );
      return [...preserved, ...generatedDocuments];
    })();

    const statusLabel =
      mergedDocuments.length === 0
        ? errors.length > 0
          ? "failed"
          : "skipped"
        : errors.length > 0
        ? "partial"
        : "completed";

    const updatePayload: Record<string, any> = {
      documentsGenerationStatus: statusLabel,
      documentsGenerationCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (mergedDocuments.length > 0) {
      updatePayload.documents = mergedDocuments;
      updatePayload.documentsGenerated = true;
    }

    if (errors.length > 0) {
      updatePayload.documentsGenerationErrors = errors;
    } else {
      updatePayload.documentsGenerationErrors = admin.firestore.FieldValue.delete();
    }

    try {
      await change.after.ref.set(updatePayload, { merge: true });
      functions.logger.info(
        "Student documents auto-generation finished",
        purchaseId,
        {
          generated: generatedDocuments.length,
          errors: errors.length,
          status: statusLabel,
        }
      );
    } catch (error) {
      functions.logger.error(
        "Failed to update purchase after auto-generation",
        purchaseId,
        error
      );
    }
  });
*/
// =============================
// Stripe Webhook for Payment Links
// =============================
// Direct request handler (bypass Express) to get raw body for Stripe signature verification
// Cloud Functions v2 parses JSON before Express, so we need to handle the raw request directly
async function handleStripeWebhook(req, res) {
    var _a, e_1, _b, _c, _d, e_2, _e, _f;
    const sig = req.headers['stripe-signature'];
    if (!sig) {
        console.error('Missing Stripe signature header');
        res.status(400).send('Missing signature');
        return;
    }
    const stripe = new stripe_1.default(resolveStripeSecretKey(), { apiVersion: "2023-10-16" });
    let event;
    try {
        // CRITICAL: Read raw body from request stream BEFORE any parsing
        // In Cloud Functions v2, we need to read the stream directly
        let rawBody;
        // Try to get raw body from the request
        // Method 1: Check if req.rawBody exists (set by middleware if any)
        if (req.rawBody && Buffer.isBuffer(req.rawBody)) {
            rawBody = req.rawBody;
            console.log('✅ Using req.rawBody, length:', rawBody.length);
        }
        // Method 2: Check if req.body is already a Buffer (from express.raw())
        else if (Buffer.isBuffer(req.body)) {
            rawBody = req.body;
            console.log('✅ Using req.body as Buffer, length:', rawBody.length);
        }
        // Method 3: Read from request stream if available
        else if (req.readable && typeof req.read === 'function') {
            // Request stream is still readable, read it
            const chunks = [];
            try {
                for (var _g = true, req_1 = __asyncValues(req), req_1_1; req_1_1 = await req_1.next(), _a = req_1_1.done, !_a; _g = true) {
                    _c = req_1_1.value;
                    _g = false;
                    const chunk = _c;
                    chunks.push(chunk);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_g && !_a && (_b = req_1.return)) await _b.call(req_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            rawBody = Buffer.concat(chunks);
            console.log('✅ Read raw body from stream, length:', rawBody.length);
        }
        // Method 4: If body is string, convert to Buffer
        else if (typeof req.body === 'string') {
            rawBody = Buffer.from(req.body, 'utf8');
            console.log('✅ Using req.body as string, converted to Buffer, length:', rawBody.length);
        }
        // Method 5: Last resort - try to reconstruct from parsed object (will fail signature verification)
        else {
            console.error('❌ CRITICAL: Cannot get raw body');
            console.error('   Body type:', typeof req.body);
            console.error('   Is Buffer:', Buffer.isBuffer(req.body));
            console.error('   Has rawBody:', !!req.rawBody);
            console.error('   Is readable:', req.readable);
            // Try to get raw body from the underlying request if available
            const underlyingReq = req.raw || req;
            if (underlyingReq && underlyingReq.readable) {
                const chunks = [];
                try {
                    for (var _h = true, underlyingReq_1 = __asyncValues(underlyingReq), underlyingReq_1_1; underlyingReq_1_1 = await underlyingReq_1.next(), _d = underlyingReq_1_1.done, !_d; _h = true) {
                        _f = underlyingReq_1_1.value;
                        _h = false;
                        const chunk = _f;
                        chunks.push(chunk);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (!_h && !_d && (_e = underlyingReq_1.return)) await _e.call(underlyingReq_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                rawBody = Buffer.concat(chunks);
                console.log('✅ Read from underlying request stream, length:', rawBody.length);
            }
            else {
                throw new Error('Webhook payload must be provided as a string or a Buffer instance representing the _raw_ request body. Payload was provided as a parsed JavaScript object instead.');
            }
        }
        if (!rawBody || rawBody.length === 0) {
            throw new Error('Empty request body');
        }
        // Trim webhook secret to remove any whitespace
        const webhookSecret = resolveStripeWebhookSecret();
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
        console.log('✅ Webhook signature verified');
        console.log('   Event type:', event.type);
        console.log('   Event ID:', event.id);
    }
    catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        console.error('   Body type:', typeof req.body);
        console.error('   Is Buffer:', Buffer.isBuffer(req.body));
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    // CRITICAL: Respond to Stripe immediately to prevent timeout
    // Then process the webhook asynchronously
    res.json({ received: true });
    // Process webhook asynchronously (don't await, let it run in background)
    processWebhookAsync(event).catch((error) => {
        console.error('❌ Error in async webhook processing:', error);
    });
}
// Create Express app with raw body middleware
// CRITICAL: Must read raw body BEFORE Express parses it
const webhookApp = express.default();
// Middleware to capture raw body from stream BEFORE Express processes it
webhookApp.use((req, res, next) => {
    if (req.method !== 'POST') {
        return next();
    }
    // If stream is still readable, read it
    if (req.readable && !req.readableEnded) {
        const chunks = [];
        req.on('data', (chunk) => {
            chunks.push(chunk);
        });
        req.on('end', () => {
            req.rawBody = Buffer.concat(chunks);
            console.log('📦 Raw body captured from stream, length:', req.rawBody.length);
            next();
        });
        req.on('error', (err) => {
            console.error('❌ Error reading stream:', err);
            res.status(500).send('Error reading request body');
        });
    }
    else {
        // Stream already consumed, try express.raw() as fallback
        next();
    }
});
// Use express.raw() as fallback if stream was already consumed
webhookApp.use(express.raw({ type: 'application/json' }));
webhookApp.post('/', handleStripeWebhook);
// ⭐ NUEVO: Core function to generate accion_tutela document package
async function generateTutelaDocumentPackageCore({ userId, userEmail, formData, tutelaId, docId, uploadedDocuments, openai: providedOpenAI, }) {
    if (!userId || !formData || !tutelaId || !docId) {
        throw new Error("Missing required fields for tutela document generation.");
    }
    const openai = providedOpenAI !== null && providedOpenAI !== void 0 ? providedOpenAI : createOpenAIClient();
    // Build reference text from uploaded documents
    let uploadedDocumentsContext = '';
    if (uploadedDocuments && uploadedDocuments.length > 0) {
        const documentsText = uploadedDocuments
            .filter(doc => doc.extractedText && doc.extractedText.trim().length > 0)
            .map((doc, index) => {
            const textPreview = doc.extractedText.substring(0, 2000); // Limit to 2000 chars per document
            return `DOCUMENTO ${index + 1} - ${doc.fileName}:\n${textPreview}${doc.extractedText.length > 2000 ? '...' : ''}`;
        })
            .join('\n\n---\n\n');
        if (documentsText) {
            uploadedDocumentsContext = `\n\nDOCUMENTOS DE REFERENCIA SUBIDOS POR EL USUARIO:\nEstos documentos fueron proporcionados por el usuario y deben ser utilizados como referencia para elaborar la acción de tutela. Extrae información relevante, hechos, fechas, nombres, y cualquier detalle que pueda fortalecer el caso:\n\n${documentsText}\n\nIMPORTANTE: Utiliza la información de estos documentos para enriquecer los hechos, fundamentos de derecho, y peticiones. Si los documentos contienen información contradictoria con el formulario, prioriza la información del formulario pero menciona las discrepancias si son relevantes.`;
        }
    }
    // Build comprehensive prompt for accion de tutela
    const prompt = `Genera un documento legal completo de ACCIÓN DE TUTELA conforme a la Constitución Política de Colombia (art. 86) y el Decreto 2591 de 1991.

DATOS DEL FORMULARIO:
- Vulnerador (persona/entidad que vulnera el derecho): ${formData.vulnerador || 'No especificado'}
- Hechos detallados: ${formData.hechos || 'No especificado'}
- Derecho vulnerado: ${formData.derecho || 'No especificado'}
- Peticiones (órdenes concretas): ${formData.peticiones || 'No especificado'}
- Medidas provisionales solicitadas: ${formData.medidasProvisionales ? 'Sí' : 'No'}
- Ciudad: ${formData.ciudad || 'Bogotá'}${uploadedDocumentsContext}

El documento debe incluir TODAS las secciones siguientes de forma profesional y completa:

1. ENCABEZADO:
   - Nombre del tribunal competente (Juzgado de la ciudad especificada)
   - Radicación y fecha

2. IDENTIFICACIÓN DEL ACCIONANTE:
   - Nombre completo
   - Número de identificación
   - Dirección de residencia
   - Teléfono y correo electrónico

3. IDENTIFICACIÓN DEL ACCIONADO:
   - Nombre completo de la persona o entidad que vulnera el derecho
   - Identificación (si aplica)
   - Dirección

4. HECHOS:
   - Relato detallado, cronológico y preciso de los hechos que dieron lugar a la vulneración
   - Fechas, lugares y circunstancias específicas
   - Consecuencias de la vulneración

5. FUNDAMENTOS DE DERECHO:
   - Artículo 86 de la Constitución Política de Colombia
   - Decreto 2591 de 1991
   - Jurisprudencia relevante de la Corte Constitucional
   - Normas específicas relacionadas con el derecho vulnerado
   - Argumentación jurídica sólida

6. PETICIONES:
   - Órdenes concretas y específicas al juez
   - Medidas de protección inmediata solicitadas
   - Si aplica: solicitud de medidas provisionales

7. PRUEBAS:
   - Lista de documentos que se anexan
   - Referencia a pruebas documentales, testimoniales, etc.

8. JURAMENTO:
   - Declaración bajo juramento de veracidad

9. FIRMAS:
   - Firma del accionante
   - Fecha y lugar

El documento debe ser profesional, completo, y listo para presentación ante el juez competente. Debe tener una extensión mínima de 2,000 palabras y seguir el formato estándar de acciones de tutela en Colombia.`;
    console.log('🚀 Generando Acción de Tutela con OpenAI...');
    const tutelaResult = await runChatCompletion(openai, [
        {
            role: "system",
            content: "Eres un abogado especializado en derecho constitucional y acciones de tutela en Colombia. Generas documentos legales profesionales, completos y precisos conforme a la Constitución Política (art. 86) y el Decreto 2591 de 1991. Tus documentos son listos para presentación ante el juez competente.",
        },
        {
            role: "user",
            content: prompt,
        },
    ], 4000 // max_tokens
    );
    console.log('✅ Documento de Acción de Tutela generado con OpenAI');
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const basePath = buildStoragePath(userId, "autoservicio", "accion-tutela", "documents", tutelaId, timestamp);
    // Generate PDF and DOCX in parallel
    console.log('📄 Generando PDF y DOCX en paralelo...');
    const [tutelaPdf, tutelaDocx] = await Promise.all([
        createPdfBuffer({
            title: `Acción de Tutela - ${formData.derecho || 'Derecho Constitucional'}`,
            subtitle: `Ciudad: ${formData.ciudad || 'Bogotá'} • Tutela ID: ${tutelaId}`,
            body: tutelaResult.text,
            footerNote: "Documento legal generado por Avocat LegalTech - Acción de Tutela conforme a la Constitución Política de Colombia",
        }),
        createDocxBuffer({
            title: `Acción de Tutela - ${formData.derecho || 'Derecho Constitucional'}`,
            subtitle: `Ciudad: ${formData.ciudad || 'Bogotá'} • Tutela ID: ${tutelaId}`,
            body: tutelaResult.text,
            footerNote: "Documento legal generado por Avocat LegalTech - Acción de Tutela conforme a la Constitución Política de Colombia",
        }),
    ]);
    console.log('✅ PDF y DOCX generados');
    // Upload to Storage in parallel
    const [tutelaPdfUpload, tutelaDocxUpload] = await Promise.all([
        uploadToStorage(tutelaPdf, `${basePath}/accion-tutela-${docId}.pdf`, "application/pdf"),
        uploadToStorage(tutelaDocx, `${basePath}/accion-tutela-${docId}.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    ]);
    console.log('✅ Archivos subidos a Storage');
    // Save to Firestore (optional - for tracking)
    const firestore = admin.firestore();
    const packageRef = firestore.collection("tutela_document_packages").doc();
    await packageRef.set({
        userId,
        userEmail: userEmail || null,
        tutelaId,
        docId,
        formData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "generated",
        storageBasePath: basePath,
        outputs: {
            tutela: {
                text: tutelaResult.text,
                pdf: tutelaPdfUpload,
                docx: tutelaDocxUpload,
            },
        },
        openai: {
            model: tutelaResult.model,
            tokens: tutelaResult.tokens,
        },
    });
    return {
        packageId: packageRef.id,
        storageBasePath: basePath,
        files: {
            tutelaPdf: tutelaPdfUpload,
            tutelaDocx: tutelaDocxUpload,
        },
    };
}
// ⭐ NUEVO: Generate reclamación de cantidades document package
async function generateReclamacionDocumentPackageCore({ userId, userEmail, caseId, uid, openai: providedOpenAI, }) {
    var _a;
    if (!userId || !caseId || !uid) {
        throw new Error("Missing required fields for reclamación document generation.");
    }
    const openai = providedOpenAI !== null && providedOpenAI !== void 0 ? providedOpenAI : createOpenAIClient();
    const db = admin.firestore();
    // Obtener caso de Firestore
    const caseRef = db.collection('users').doc(uid).collection('reclamaciones_cantidades').doc(caseId);
    const caseDoc = await caseRef.get();
    if (!caseDoc.exists) {
        throw new Error(`Caso ${caseId} no encontrado para usuario ${uid}`);
    }
    const caseData = caseDoc.data();
    // Validar que tiene datos necesarios
    if (!caseData.ocr || !caseData.formData) {
        throw new Error('El caso debe tener OCR y formData completos');
    }
    console.log(`🚀 Generando escrito final para reclamación ${caseId}`);
    // Construir prompt final (mismo que en Next.js)
    const PROMPT_MAESTRO = `Eres un abogado experto en derecho laboral en España, especializado en reclamaciones de cantidad frente a empresas por salarios, complementos, horas extra u otros conceptos retributivos impagados.

Tu tarea es redactar un ESCRITO COMPLETO de reclamación de cantidades, listo para ser presentado ante el órgano judicial competente en España, siguiendo una estructura profesional:

1. Encabezado y datos de las partes (demandante y empresa demandada).

2. Exposición detallada de los HECHOS, de forma cronológica y clara.

3. FUNDAMENTOS DE DERECHO, citando normativa aplicable (Estatuto de los Trabajadores, Convenio Colectivo, LEC, etc.) de forma general, sin hacer afirmaciones excesivamente específicas que puedan ser erróneas.

4. SUPLICO al Juzgado con la petición clara de las cantidades adeudadas y demás pronunciamientos.

5. Otrosíes si procede.

Utiliza lenguaje profesional pero comprensible. Evita rellenar datos que no se te hayan proporcionado; en esos casos, indica claramente "[DATO A COMPLETAR]".

Datos disponibles (JSON):

• Datos del demandante y de la empresa:

${JSON.stringify(caseData.formData, null, 2)}

• Información estructurada extraída por OCR:

${JSON.stringify(caseData.ocr.extracted || {}, null, 2)}

• Resumen del texto OCR:

${((_a = caseData.ocr.rawText) === null || _a === void 0 ? void 0 : _a.substring(0, 2000)) || 'No hay resumen disponible del OCR.'}

IMPORTANTE: Este es el escrito FINAL que se presentará ante el juzgado. Debe ser completo, preciso y profesional. No dejes datos pendientes de completar.

Redacta el escrito en español de España, con formato claro, párrafos bien separados y sin instrucciones para el usuario final. No incluyas explicaciones sobre lo que estás haciendo; solo devuelve el texto del escrito.`;
    // Generar escrito final con OpenAI
    console.log('🤖 Generando escrito final con OpenAI...');
    const reclamacionResult = await runChatCompletion(openai, [
        {
            role: 'system',
            content: 'Eres un abogado experto español especializado en reclamaciones de cantidades. Generas documentos legales profesionales, precisos y completos según la legislación española vigente. Este es el escrito FINAL que se presentará ante el juzgado.',
        },
        {
            role: 'user',
            content: PROMPT_MAESTRO,
        },
    ], 4000 // max_tokens
    );
    console.log('✅ Escrito final generado');
    // Actualizar estado en Firestore
    await caseRef.update({
        status: 'paid',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const basePath = buildStoragePath(userId, "autoservicio", "reclamacion-cantidades", "documents", caseId, timestamp);
    // Generate PDF and DOCX in parallel
    console.log('📄 Generando PDF y DOCX en paralelo...');
    const [reclamacionPdf, reclamacionDocx] = await Promise.all([
        createPdfBuffer({
            title: 'RECLAMACIÓN DE CANTIDADES',
            subtitle: `Caso: ${caseId}`,
            body: reclamacionResult.text,
            footerNote: "Documento legal generado por Avocat LegalTech - Reclamación de Cantidades conforme a la legislación española",
        }),
        createDocxBuffer({
            title: 'RECLAMACIÓN DE CANTIDADES',
            subtitle: `Caso: ${caseId}`,
            body: reclamacionResult.text,
            footerNote: "Documento legal generado por Avocat LegalTech - Reclamación de Cantidades conforme a la legislación española",
        }),
    ]);
    console.log('✅ PDF y DOCX generados');
    // Upload to Storage in parallel
    const [reclamacionPdfUpload, reclamacionDocxUpload] = await Promise.all([
        uploadToStorage(reclamacionPdf, `${basePath}/reclamacion-cantidades-${caseId}.pdf`, "application/pdf"),
        uploadToStorage(reclamacionDocx, `${basePath}/reclamacion-cantidades-${caseId}.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    ]);
    console.log('✅ Archivos subidos a Storage');
    // Actualizar Firestore con URLs del documento
    await caseRef.update({
        'storage.finalPdf': {
            path: reclamacionPdfUpload.path,
            url: reclamacionPdfUpload.downloadUrl,
            generatedAt: new Date().toISOString(),
        },
        'payment.paidAt': new Date().toISOString(),
        'payment.status': 'paid',
        status: 'paid',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Save to Firestore (optional - for tracking)
    const packageRef = db.collection("reclamacion_document_packages").doc();
    await packageRef.set({
        userId,
        userEmail: userEmail || null,
        caseId,
        uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "generated",
        storageBasePath: basePath,
        outputs: {
            reclamacion: {
                text: reclamacionResult.text,
                pdf: reclamacionPdfUpload,
                docx: reclamacionDocxUpload,
            },
        },
        openai: {
            model: reclamacionResult.model,
            tokens: reclamacionResult.tokens,
        },
    });
    return {
        packageId: packageRef.id,
        storageBasePath: basePath,
        files: {
            reclamacionPdf: reclamacionPdfUpload,
            reclamacionDocx: reclamacionDocxUpload,
        },
    };
}
// ⭐ NUEVO: Helper function to process accion_tutela documents in webhook
async function processTutelaDocument(item, itemIndex, purchaseRef, userId, customerEmail, tutelaId, docId, formData, openai) {
    var _a, _b, _c, _d;
    try {
        console.log(`📋 Procesando documento de Acción de Tutela: ${item.name}`);
        if (!formData || !tutelaId || !docId) {
            throw new Error('Missing required formData, tutelaId, or docId for document generation');
        }
        // Retrieve uploaded documents from Firestore
        let uploadedDocuments = [];
        try {
            const uploadsSnapshot = await admin.firestore()
                .collection('document_uploads')
                .where('userId', '==', userId)
                .where('documentType', '==', 'tutelas')
                .where('documentId', '==', tutelaId)
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();
            if (!uploadsSnapshot.empty) {
                const uploadData = uploadsSnapshot.docs[0].data();
                if (uploadData.uploadedFiles && Array.isArray(uploadData.uploadedFiles)) {
                    // Use extracted text from Firestore
                    uploadedDocuments = uploadData.uploadedFiles.map((file) => ({
                        fileName: file.fileName,
                        storagePath: file.storagePath,
                        downloadUrl: file.downloadUrl,
                        extractedText: file.extractedText || undefined, // Text stored in Firestore
                    }));
                    console.log(`✅ Found ${uploadedDocuments.length} uploaded documents for tutelaId: ${tutelaId}`);
                }
            }
        }
        catch (error) {
            console.warn('⚠️ Could not retrieve uploaded documents:', error);
            // Continue without uploaded documents
        }
        // Generate all quantities in parallel
        const quantityPromises = Array.from({ length: item.quantity }, (_, i) => {
            return generateTutelaDocumentPackageCore({
                userId: userId,
                userEmail: customerEmail,
                formData: formData,
                tutelaId: tutelaId,
                docId: `${docId}_${i + 1}`, // Unique docId for each quantity
                uploadedDocuments: uploadedDocuments, // Pass uploaded documents
                openai,
            }).then(generation => {
                var _a, _b;
                return ({
                    documentId: generation.packageId,
                    storagePath: ((_a = generation.files.tutelaPdf) === null || _a === void 0 ? void 0 : _a.path) || null,
                    downloadUrl: ((_b = generation.files.tutelaPdf) === null || _b === void 0 ? void 0 : _b.downloadUrl) || null,
                    generatedAt: admin.firestore.Timestamp.now(),
                    packageFiles: {
                        tutelaPdf: generation.files.tutelaPdf,
                        tutelaDocx: generation.files.tutelaDocx,
                    }
                });
            }).catch(error => {
                console.error(`❌ Error generando documento de tutela (quantity ${i + 1}):`, error);
                return null;
            });
        });
        // Wait for all quantities to complete
        const quantityResults = await Promise.allSettled(quantityPromises);
        const generatedDocuments = quantityResults
            .map((result, index) => {
            if (result.status === 'fulfilled' && result.value !== null) {
                return result.value;
            }
            else {
                console.error(`❌ Failed to generate tutela document (quantity ${index + 1})`);
                return null;
            }
        })
            .filter((doc) => doc !== null);
        // Get packageFiles from first successful document
        const firstDocPackageFiles = generatedDocuments.length > 0 && ((_a = generatedDocuments[0]) === null || _a === void 0 ? void 0 : _a.packageFiles)
            ? generatedDocuments[0].packageFiles
            : {};
        const itemResult = Object.assign(Object.assign({}, item), { packageFiles: firstDocPackageFiles, documentId: ((_b = generatedDocuments[0]) === null || _b === void 0 ? void 0 : _b.documentId) || null, storagePath: ((_c = generatedDocuments[0]) === null || _c === void 0 ? void 0 : _c.storagePath) || null, downloadUrl: ((_d = generatedDocuments[0]) === null || _d === void 0 ? void 0 : _d.downloadUrl) || null, generatedAt: admin.firestore.Timestamp.now(), status: generatedDocuments.length > 0 ? 'completed' : 'failed', documents: generatedDocuments, generatedCount: generatedDocuments.length, requestedCount: item.quantity, documentType: 'accion_tutela', tutelaId: tutelaId, docId: docId, formData: formData });
        console.log(`✅ Acción de Tutela generada: ${item.name} (${generatedDocuments.length}/${item.quantity} generados)`);
        console.log(`   Tutela ID: ${tutelaId}`);
        console.log(`   Doc ID: ${docId}`);
        return itemResult;
    }
    catch (error) {
        console.error(`❌ Error procesando documento de tutela ${item.name}:`, error);
        return Object.assign(Object.assign({}, item), { status: 'failed', error: error instanceof Error ? error.message : 'Unknown error', documentType: 'accion_tutela' });
    }
}
// Async function to process webhook without blocking the response
async function processWebhookAsync(event) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    try {
        const db = admin.firestore();
        const openai = createOpenAIClient();
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            // Only process payment mode sessions that are actually paid
            if (session.mode !== 'payment' || session.payment_status !== 'paid') {
                console.log(`Skipping session ${session.id}: mode=${session.mode}, status=${session.payment_status}`);
                return;
            }
            console.log('📦 Procesando compra completada:', session.id);
            console.log('   Payment Status:', session.payment_status);
            console.log('   Amount:', session.amount_total, session.currency);
            console.log('   Customer Email:', session.customer_email);
            // Check if purchase already exists (prevent duplicates)
            const existingPurchase = await db.collection('purchases')
                .where('stripeSessionId', '==', session.id)
                .limit(1)
                .get();
            if (!existingPurchase.empty) {
                const existingId = existingPurchase.docs[0].id;
                console.warn(`⚠️ Purchase already exists for session ${session.id}: ${existingId}. Skipping duplicate creation.`);
                return;
            }
            // Extract metadata
            // ⭐ NUEVO: Payment Links no pasan metadata, buscar en Firestore
            let itemsJson = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.items;
            let documentType = ((_b = session.metadata) === null || _b === void 0 ? void 0 : _b.documentType) || 'estudiantes';
            let tutelaId = ((_c = session.metadata) === null || _c === void 0 ? void 0 : _c.tutelaId) || null;
            let docId = ((_d = session.metadata) === null || _d === void 0 ? void 0 : _d.docId) || null;
            let caseId = ((_e = session.metadata) === null || _e === void 0 ? void 0 : _e.caseId) || null;
            let uid = ((_f = session.metadata) === null || _f === void 0 ? void 0 : _f.uid) || null;
            let formDataJson = (_g = session.metadata) === null || _g === void 0 ? void 0 : _g.formData;
            let formData = formDataJson ? JSON.parse(formDataJson) : null;
            // Detectar reclamación si tiene caseId y uid pero no documentType
            if (!documentType || documentType === 'estudiantes') {
                if (caseId && uid) {
                    documentType = 'reclamacion_cantidades';
                    console.log('✅ Reclamación detectada por caseId y uid');
                }
            }
            // Declare userId and customerEmail early to avoid "used before declaration" error
            let userId = ((_h = session.metadata) === null || _h === void 0 ? void 0 : _h.userId) || null;
            let customerEmail = session.customer_email || null;
            // Si no hay metadata en session (Payment Link), buscar en Firestore
            if (!itemsJson) {
                console.log('📋 Payment Link detectado, buscando metadata en Firestore...');
                try {
                    let metadataSnapshot = null;
                    // Método 1: Buscar por email si está disponible
                    if (session.customer_email) {
                        try {
                            metadataSnapshot = await db.collection('payment_metadata')
                                .where('customerEmail', '==', session.customer_email)
                                .where('status', '==', 'pending_payment')
                                .orderBy('createdAt', 'desc')
                                .limit(1)
                                .get();
                            if (!metadataSnapshot.empty) {
                                console.log('✅ Metadata encontrada por email:', session.customer_email);
                            }
                        }
                        catch (emailError) {
                            // Si falla por falta de índice, intentar sin orderBy
                            if (emailError.code === 'failed-precondition') {
                                console.warn('⚠️ Falta índice para búsqueda por email, intentando sin orderBy...');
                                try {
                                    metadataSnapshot = await db.collection('payment_metadata')
                                        .where('customerEmail', '==', session.customer_email)
                                        .where('status', '==', 'pending_payment')
                                        .limit(1)
                                        .get();
                                    if (!metadataSnapshot.empty) {
                                        console.log('✅ Metadata encontrada por email (sin orderBy):', session.customer_email);
                                    }
                                }
                                catch (emailError2) {
                                    console.warn('⚠️ Error en búsqueda por email sin orderBy:', emailError2);
                                }
                            }
                        }
                    }
                    // Método 2: Si no se encontró por email, buscar por sessionId (si ya se guardó)
                    if ((!metadataSnapshot || metadataSnapshot.empty) && session.id) {
                        try {
                            metadataSnapshot = await db.collection('payment_metadata')
                                .where('sessionId', '==', session.id)
                                .limit(1)
                                .get();
                            if (!metadataSnapshot.empty) {
                                console.log('✅ Metadata encontrada por sessionId:', session.id);
                            }
                        }
                        catch (sessionError) {
                            console.warn('⚠️ Error buscando por sessionId:', sessionError);
                        }
                    }
                    // Método 3: Buscar metadata más reciente del usuario (si tenemos userId de otra forma)
                    // Esto se hará después si aún no tenemos metadata
                    if (metadataSnapshot && !metadataSnapshot.empty) {
                        const metadataDoc = metadataSnapshot.docs[0];
                        const metadata = metadataDoc.data();
                        console.log('✅ Metadata encontrada en Firestore:', metadataDoc.id);
                        console.log('   userId:', metadata.userId);
                        console.log('   customerEmail:', metadata.customerEmail);
                        console.log('   documentType:', metadata.documentType);
                        // Usar metadata de Firestore
                        documentType = metadata.documentType || 'estudiantes';
                        tutelaId = metadata.tutelaId || null;
                        docId = metadata.docId || null;
                        formData = metadata.formData || null;
                        // Si no tenemos userId aún, obtenerlo de la metadata
                        if (!userId || userId === 'unknown') {
                            userId = metadata.userId || null;
                            if (userId) {
                                console.log('✅ userId obtenido de metadata:', userId);
                            }
                        }
                        // Si no tenemos customerEmail, obtenerlo de la metadata
                        if (!customerEmail && metadata.customerEmail) {
                            customerEmail = metadata.customerEmail;
                            console.log('✅ customerEmail obtenido de metadata:', customerEmail);
                        }
                        // Construir items desde metadata
                        if (metadata.items && Array.isArray(metadata.items)) {
                            itemsJson = JSON.stringify(metadata.items);
                            // Marcar metadata como procesada
                            await metadataDoc.ref.update({
                                status: 'processed',
                                processedAt: admin.firestore.FieldValue.serverTimestamp(),
                                sessionId: session.id
                            });
                            console.log('✅ Metadata marcada como procesada');
                        }
                    }
                    else {
                        console.warn('⚠️ No se encontró metadata en Firestore');
                        console.warn('   customerEmail en session:', session.customer_email || 'null');
                        console.warn('   sessionId:', session.id);
                    }
                }
                catch (error) {
                    console.error('❌ Error buscando metadata en Firestore:', error);
                }
            }
            if (!itemsJson) {
                // Si aún no hay items, intentar construir desde line_items del Payment Link
                // Nota: line_items puede no estar expandido, necesitamos recuperarlo
                try {
                    const stripe = new stripe_1.default(resolveStripeSecretKey(), { apiVersion: "2023-10-16" });
                    const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
                        expand: ['line_items', 'line_items.data.price.product']
                    });
                    if (expandedSession.line_items && expandedSession.line_items.data && expandedSession.line_items.data.length > 0) {
                        console.log('📋 Construyendo items desde line_items del Payment Link...');
                        const lineItems = expandedSession.line_items.data;
                        const constructedItems = lineItems.map((lineItem) => {
                            var _a;
                            const price = lineItem.price;
                            const amount = (price === null || price === void 0 ? void 0 : price.unit_amount) || 0;
                            const quantity = lineItem.quantity || 1;
                            // Determinar documentType basado en el nombre del producto
                            const productName = ((_a = price === null || price === void 0 ? void 0 : price.product) === null || _a === void 0 ? void 0 : _a.name) || lineItem.description || '';
                            const detectedDocumentType = productName.toLowerCase().includes('tutela')
                                ? 'accion_tutela'
                                : 'estudiantes';
                            return {
                                name: productName || 'Documento legal',
                                area: detectedDocumentType === 'accion_tutela' ? 'Derecho Constitucional' : 'General',
                                country: detectedDocumentType === 'accion_tutela' ? 'Colombia' : 'España',
                                price: amount, // Ya está en centavos
                                quantity: quantity
                            };
                        });
                        itemsJson = JSON.stringify(constructedItems);
                        // Actualizar documentType si se detectó desde el producto
                        if (documentType === 'estudiantes' && constructedItems.length > 0) {
                            const firstItem = constructedItems[0];
                            if (firstItem.name.toLowerCase().includes('tutela')) {
                                documentType = 'accion_tutela';
                            }
                        }
                        console.log('✅ Items construidos desde line_items:', constructedItems);
                    }
                    else {
                        console.error('❌ No items found in session metadata, Firestore, or line_items');
                        console.error('   Session metadata:', JSON.stringify(session.metadata, null, 2));
                        return;
                    }
                }
                catch (stripeError) {
                    console.error('❌ Error recuperando line_items de Stripe:', stripeError);
                    console.error('   Session metadata:', JSON.stringify(session.metadata, null, 2));
                    return;
                }
            }
            const items = JSON.parse(itemsJson);
            // Safety check: ensure items array is valid
            if (!items || !Array.isArray(items) || items.length === 0) {
                console.error('❌ CRITICAL: Items array is empty or invalid after parsing!');
                console.error('   itemsJson:', itemsJson);
                console.error('   Parsed items:', items);
                console.error('   Session metadata:', JSON.stringify(session.metadata, null, 2));
                // Don't proceed if we have no items - this would create an invalid purchase
                return;
            }
            if (!formDataJson && formData) {
                formDataJson = JSON.stringify(formData);
            }
            console.log(`📋 Document Type: ${documentType}`);
            console.log(`   Items count: ${items.length}`);
            if (documentType === 'accion_tutela') {
                console.log(`   Tutela ID: ${tutelaId}`);
                console.log(`   Doc ID: ${docId}`);
            }
            else if (documentType === 'reclamacion_cantidades') {
                console.log(`   Case ID: ${caseId}`);
                console.log(`   UID: ${uid}`);
            }
            // userId and customerEmail were already declared above, now we try to get them from various sources
            // If not set yet, try to get from session metadata
            if (!userId) {
                userId = ((_j = session.metadata) === null || _j === void 0 ? void 0 : _j.userId) || null;
            }
            // Try to get customer email from various sources if not already set
            if (!customerEmail) {
                customerEmail = session.customer_email || null;
            }
            // If no customer_email in session, try to get it from customer or payment intent
            if (!customerEmail && session.customer) {
                try {
                    const stripe = new stripe_1.default(resolveStripeSecretKey(), { apiVersion: "2023-10-16" });
                    const customer = await stripe.customers.retrieve(session.customer);
                    if (typeof customer !== 'string' && !customer.deleted && 'email' in customer && customer.email) {
                        customerEmail = customer.email;
                        console.log(`✅ Email obtenido del customer: ${customerEmail}`);
                    }
                }
                catch (error) {
                    console.warn('⚠️ No se pudo obtener email del customer:', error);
                }
            }
            // If still no email, try from payment intent
            if (!customerEmail && session.payment_intent) {
                try {
                    const stripe = new stripe_1.default(resolveStripeSecretKey(), { apiVersion: "2023-10-16" });
                    const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
                    if (paymentIntent.receipt_email) {
                        customerEmail = paymentIntent.receipt_email;
                        console.log(`✅ Email obtenido del payment intent: ${customerEmail}`);
                    }
                }
                catch (error) {
                    console.warn('⚠️ No se pudo obtener email del payment intent:', error);
                }
            }
            // Try to find user by email if we have it
            if (!userId || userId === 'unknown') {
                if (customerEmail) {
                    try {
                        const usersSnapshot = await db.collection('users')
                            .where('email', '==', customerEmail)
                            .limit(1)
                            .get();
                        if (!usersSnapshot.empty) {
                            userId = usersSnapshot.docs[0].id;
                            console.log(`✅ Usuario encontrado por email: ${userId}`);
                        }
                        else {
                            console.warn(`⚠️ Usuario no encontrado para email: ${customerEmail}`);
                            // Don't set to 'unknown' yet, try other methods
                        }
                    }
                    catch (error) {
                        console.error('Error buscando usuario por email:', error);
                    }
                }
            }
            // If we have formData, try to get userId from there
            if ((!userId || userId === 'unknown') && formData && typeof formData === 'object') {
                try {
                    if (formData.userId) {
                        userId = formData.userId;
                        console.log(`✅ UserId obtenido de formData: ${userId}`);
                    }
                }
                catch (error) {
                    console.warn('⚠️ No se pudo obtener userId de formData:', error);
                }
            }
            // Final fallback: if still no userId, we cannot proceed
            if (!userId || userId === 'unknown') {
                console.error('❌ No se pudo determinar userId. No se puede crear el purchase.');
                console.error('   Session ID:', session.id);
                console.error('   Customer Email:', customerEmail || 'null');
                console.error('   Metadata:', JSON.stringify(session.metadata, null, 2));
                // Don't throw, just log and return - we already responded to Stripe
                return;
            }
            // Ensure customerEmail has a value (even if it's a placeholder)
            if (!customerEmail) {
                customerEmail = `user-${userId}@unknown.com`;
                console.warn(`⚠️ Usando email placeholder: ${customerEmail}`);
            }
            const totalAmount = session.amount_total || 0;
            const currency = ((_k = session.currency) === null || _k === void 0 ? void 0 : _k.toUpperCase()) || 'EUR';
            // Create purchase document
            const purchaseId = (0, uuid_1.v4)();
            const purchaseRef = db.collection('purchases').doc(purchaseId);
            const purchaseData = {
                id: purchaseId,
                userId,
                customerEmail,
                stripeSessionId: session.id, // REQUIRED: This identifies webhook-created purchases
                stripePaymentIntentId: session.payment_intent,
                items: items.map((item) => {
                    // Para COP, el precio ya está en la unidad mínima (no hay centavos)
                    // Para EUR, el precio está en centavos y necesita conversión
                    const isCOP = currency === 'COP';
                    const itemPrice = isCOP ? item.price : item.price / 100;
                    return {
                        id: (0, uuid_1.v4)(),
                        name: item.name,
                        area: item.area,
                        country: item.country,
                        price: itemPrice,
                        quantity: item.quantity,
                        status: 'pending', // Will be updated to 'completed' after document generation
                        documentType: documentType, // ⭐ NUEVO: Tipo de documento
                    };
                }),
                total: currency === 'COP' ? totalAmount : totalAmount / 100, // COP no usa centavos
                currency,
                status: 'completed', // Payment is completed, documents will be generated
                documentType: documentType, // ⭐ NUEVO: Tipo de documento a nivel de purchase
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                source: 'stripe_webhook',
                webhookProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
                // ⭐ NUEVO: Metadata específica para accion_tutela
                tutelaId: tutelaId,
                docId: docId,
                formData: formData,
                // ⭐ NUEVO: Metadata específica para reclamacion_cantidades
                caseId: caseId,
                uid: uid,
            };
            // Save purchase to Firestore
            await purchaseRef.set(purchaseData);
            console.log('✅ Compra guardada en Firestore:', purchaseId);
            // Track items as they complete (for incremental updates)
            const itemsStatus = [...purchaseData.items];
            let completedCount = 0;
            // Helper function to update Firestore with current progress
            const updateProgress = async () => {
                const currentDocumentsGenerated = itemsStatus.filter((item) => item.status === 'completed').length;
                await purchaseRef.update({
                    items: itemsStatus,
                    documentsGenerated: currentDocumentsGenerated,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            };
            // Helper function to generate documents for a single item (handles quantities in parallel)
            const processItemDocuments = async (item, itemIndex) => {
                var _a, _b, _c, _d;
                try {
                    console.log(`📄 [Item ${itemIndex + 1}] Generando documento: ${item.name} (x${item.quantity}) [Type: ${documentType}]`);
                    // Ensure userId is a string (not undefined)
                    if (!userId || userId === 'unknown') {
                        console.warn(`⚠️ Skipping document generation for item ${item.name}: userId is missing`);
                        itemsStatus[itemIndex] = Object.assign(Object.assign({}, item), { status: 'failed', error: 'userId is missing' });
                        await updateProgress();
                        return itemsStatus[itemIndex];
                    }
                    // ⭐ NUEVO: Procesar según el tipo de documento
                    if (documentType === 'accion_tutela') {
                        // Procesar acción de tutela - generar documentos automáticamente
                        const tutelaResult = await processTutelaDocument(item, itemIndex, purchaseRef, userId, customerEmail, tutelaId, docId, formData, openai);
                        // Update item status in our tracking array
                        itemsStatus[itemIndex] = tutelaResult;
                        completedCount++;
                        // Update Firestore with current progress
                        await updateProgress();
                        return tutelaResult;
                    }
                    else if (documentType === 'reclamacion_cantidades' && uid && caseId) {
                        // ⭐ NUEVO: Procesar reclamación de cantidades - generar documento automáticamente
                        try {
                            console.log(`📋 Procesando reclamación de cantidades: ${caseId}`);
                            // Generar documento directamente en Firebase Functions (igual que estudiantes y tutela)
                            const generation = await generateReclamacionDocumentPackageCore({
                                userId: userId,
                                userEmail: customerEmail,
                                caseId: caseId,
                                uid: uid,
                                openai,
                            });
                            const reclamacionResult = Object.assign(Object.assign({}, item), { status: 'completed', documentId: generation.packageId, storagePath: generation.files.reclamacionPdf.path, downloadUrl: generation.files.reclamacionPdf.downloadUrl, generatedAt: admin.firestore.Timestamp.now(), documentType: 'reclamacion_cantidades', caseId: caseId, uid: uid, packageFiles: generation.files });
                            itemsStatus[itemIndex] = reclamacionResult;
                            completedCount++;
                            await updateProgress();
                            return reclamacionResult;
                        }
                        catch (error) {
                            console.error(`❌ Error procesando reclamación ${caseId}:`, error);
                            const errorResult = Object.assign(Object.assign({}, item), { status: 'failed', error: error instanceof Error ? error.message : 'Unknown error', documentType: 'reclamacion_cantidades' });
                            itemsStatus[itemIndex] = errorResult;
                            await updateProgress();
                            return errorResult;
                        }
                    }
                    else {
                        // Procesar estudiantes (lógica existente)
                        // Generate all quantities in parallel
                        const quantityPromises = Array.from({ length: item.quantity }, (_, i) => {
                            return generateStudentDocumentPackageCore({
                                userId: userId,
                                userEmail: customerEmail,
                                areaLegal: item.area,
                                tipoEscrito: item.name,
                                pais: item.country,
                                openai,
                            }).then(generation => {
                                var _a, _b;
                                return ({
                                    documentId: generation.packageId,
                                    storagePath: ((_a = generation.files.studyMaterialPdf) === null || _a === void 0 ? void 0 : _a.path) || null,
                                    downloadUrl: ((_b = generation.files.studyMaterialPdf) === null || _b === void 0 ? void 0 : _b.downloadUrl) || null,
                                    generatedAt: admin.firestore.Timestamp.now(),
                                    packageFiles: generation.files
                                });
                            }).catch(error => {
                                console.error(`❌ Error generando documento ${item.name} (quantity ${i + 1}):`, error);
                                return null; // Return null for failed generations
                            });
                        });
                        // Wait for all quantities to complete (using allSettled to handle partial failures)
                        const quantityResults = await Promise.allSettled(quantityPromises);
                        const generatedDocuments = quantityResults
                            .map((result, index) => {
                            if (result.status === 'fulfilled' && result.value !== null) {
                                return result.value;
                            }
                            else {
                                console.error(`❌ Failed to generate document ${item.name} (quantity ${index + 1})`);
                                return null;
                            }
                        })
                            .filter((doc) => doc !== null);
                        // Get packageFiles from first successful document
                        const firstDocPackageFiles = generatedDocuments.length > 0 && ((_a = generatedDocuments[0]) === null || _a === void 0 ? void 0 : _a.packageFiles)
                            ? generatedDocuments[0].packageFiles
                            : {};
                        const itemResult = Object.assign(Object.assign({}, item), { packageFiles: firstDocPackageFiles, documentId: ((_b = generatedDocuments[0]) === null || _b === void 0 ? void 0 : _b.documentId) || null, storagePath: ((_c = generatedDocuments[0]) === null || _c === void 0 ? void 0 : _c.storagePath) || null, downloadUrl: ((_d = generatedDocuments[0]) === null || _d === void 0 ? void 0 : _d.downloadUrl) || null, generatedAt: admin.firestore.Timestamp.now(), status: generatedDocuments.length > 0 ? 'completed' : 'failed', documents: generatedDocuments, generatedCount: generatedDocuments.length, requestedCount: item.quantity });
                        // Update item status in our tracking array
                        itemsStatus[itemIndex] = itemResult;
                        completedCount++;
                        // Update Firestore with current progress (incremental update)
                        await updateProgress();
                        console.log(`✅ [Item ${itemIndex + 1}] Documento completado: ${item.name} (${generatedDocuments.length}/${item.quantity} generados)`);
                        return itemResult;
                    }
                }
                catch (error) {
                    console.error(`❌ Error procesando item ${item.name}:`, error);
                    const failedItem = Object.assign(Object.assign({}, item), { status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
                    // Update item status in our tracking array
                    itemsStatus[itemIndex] = failedItem;
                    completedCount++;
                    // Update Firestore with current progress
                    await updateProgress();
                    return failedItem;
                }
            };
            // Safety check: ensure items array exists and is not empty
            if (!purchaseData.items || !Array.isArray(purchaseData.items) || purchaseData.items.length === 0) {
                console.error(`❌ CRITICAL: Purchase ${purchaseId} has no items array or empty items!`);
                console.error(`   Purchase data items:`, purchaseData.items);
                console.error(`   Items from metadata:`, items);
                // Try to recover by using items from metadata if available
                if (items && Array.isArray(items) && items.length > 0) {
                    console.log(`   Attempting to recover using items from metadata...`);
                    purchaseData.items = items.map((item) => ({
                        id: (0, uuid_1.v4)(),
                        name: item.name,
                        area: item.area,
                        country: item.country,
                        price: item.price,
                        quantity: item.quantity,
                        status: 'pending',
                        documentType: documentType,
                    }));
                    // Update purchase with recovered items
                    await purchaseRef.update({
                        items: purchaseData.items,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`   ✅ Recovered ${purchaseData.items.length} items`);
                }
                else {
                    console.error(`   ❌ Cannot recover - no items available. Purchase will be incomplete.`);
                    // Still try to process with empty array to avoid breaking the flow
                    purchaseData.items = [];
                }
            }
            // Process all items in parallel
            console.log(`🚀 Iniciando generación paralela de ${purchaseData.items.length} items...`);
            const itemPromises = purchaseData.items.map((item, index) => processItemDocuments(item, index));
            // Wait for all items to complete (using allSettled to handle partial failures)
            const itemResults = await Promise.allSettled(itemPromises);
            const updatedItems = itemResults.map((result, index) => {
                if (result.status === 'fulfilled') {
                    return result.value;
                }
                else {
                    console.error(`❌ Failed to process item at index ${index}:`, result.reason);
                    const failedItem = Object.assign(Object.assign({}, purchaseData.items[index]), { status: 'failed', error: result.reason instanceof Error ? result.reason.message : 'Unknown error' });
                    itemsStatus[index] = failedItem;
                    return failedItem;
                }
            });
            // Calculate document generation status
            const documentsGenerated = updatedItems.filter((item) => item.status === 'completed').length;
            const documentsFailed = updatedItems.filter((item) => item.status === 'failed').length;
            const totalItems = updatedItems.length;
            // Calculate total documents generated (sum of all quantities)
            const totalDocumentsGenerated = updatedItems.reduce((sum, item) => {
                return sum + (item.generatedCount || (item.status === 'completed' ? item.quantity || 1 : 0));
            }, 0);
            const finalStatus = documentsGenerated > 0 ? 'completed' :
                documentsFailed === totalItems ? 'failed' : 'completed';
            // Final update with all items and status
            // Ensure items array is always set, even if empty (shouldn't happen but safety check)
            const finalUpdateData = {
                items: updatedItems.length > 0 ? updatedItems : purchaseData.items || [], // Fallback to original items if updatedItems is empty
                status: finalStatus,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                documentsGenerated: totalDocumentsGenerated,
                documentsFailed: totalItems - documentsGenerated
            };
            // Only update if we have items to avoid overwriting with empty array
            if (updatedItems.length === 0 && (!purchaseData.items || purchaseData.items.length === 0)) {
                console.error(`⚠️ WARNING: No items found in purchase ${purchaseId}. Original items:`, purchaseData.items);
                console.error(`   Updated items:`, updatedItems);
                console.error(`   This should not happen - purchase may have been created incorrectly`);
            }
            await purchaseRef.update(finalUpdateData);
            console.log(`✅ Compra procesada completamente: ${purchaseId} (status: ${finalStatus}, items: ${documentsGenerated}/${totalItems}, documentos: ${totalDocumentsGenerated})`);
            console.log(`   Items en la actualización final: ${finalUpdateData.items.length}`);
        }
        else if (event.type === 'checkout.session.expired' || event.type === 'payment_intent.payment_failed') {
            const session = event.data.object;
            const orderId = session === null || session === void 0 ? void 0 : session.client_reference_id;
            if (orderId) {
                const ref = db.collection('purchases').doc(orderId);
                await ref.set({
                    status: 'failed',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
            }
        }
    }
    catch (error) {
        console.error('Error in async webhook processing:', error);
        // Don't throw - we already responded to Stripe
    }
}
// Export the Express app as a Cloud Function
// Increased timeout to 540s (9 minutes) to allow document generation to complete
exports.stripeWebhook = functions.https.onRequest({
    secrets: [stripeSecretKey, stripeWebhookSecret, openaiApiKey].filter(Boolean),
    timeoutSeconds: 540,
    memory: '512MiB' // Increase memory for document generation
}, webhookApp);
//# sourceMappingURL=index.js.map