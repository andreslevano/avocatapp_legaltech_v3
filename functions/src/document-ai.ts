/**
 * Document AI Invoice Parser integration.
 * Extracts structured data from invoices. Requires a processor to be created in GCP Console.
 * Set DOCUMENT_AI_PROCESSOR_ID and DOCUMENT_AI_LOCATION (default: us) as env vars or secrets.
 */

import { DocumentProcessorServiceClient } from "@google-cloud/documentai/build/src/v1";

export interface DocumentAIExtractionResult {
  country: string;
  documentType: string;
  emisor: string;
  receptor: string;
  fields: { key: string; value: string }[];
}

/** Map Document AI entity type to our field key */
const ENTITY_TO_KEY: Record<string, string> = {
  supplier_name: "Emisor",
  supplier_address: "Dirección emisor",
  supplier_email: "Email emisor",
  supplier_phone: "Teléfono emisor",
  supplier_tax_id: "CIF/NIF emisor",
  supplier_iban: "IBAN emisor",
  receiver_name: "Receptor",
  receiver_address: "Dirección receptor",
  receiver_tax_id: "CIF/NIF receptor",
  invoice_id: "Nº Factura",
  invoice_date: "Fecha factura",
  invoice_due_date: "Fecha vencimiento",
  purchase_order: "Orden de compra",
  total_amount: "Total",
  total_tax_amount: "Total IVA",
  currency: "Moneda",
  net_amount: "Base imponible",
  total_line_items: "Número de líneas",
  line_item: "Línea",
  vendor_name: "Emisor",
  remit_to_name: "Receptor",
  ship_to_name: "Enviar a",
};

/** Map standard keys to Pozuelo structure columns (order: CIF PROVEEDORES, CIF CLIENTES, Nº FACTURA, FECHA, TOTAL, bases/cuotas IVA, IRPF, MONEDA) */
const TO_POZUELO_KEY: Record<string, string> = {
  "Nº Factura": "Nº FACTURA",
  "Fecha factura": "FECHA",
  "Fecha vencimiento": "Fecha vencimiento",
  "Total": "TOTAL",
  "CIF/NIF emisor": "CIF PROVEEDORES",
  "CIF/NIF receptor": "CIF CLIENTES",
  "Total IVA": "CUOTA 21%IVA",
  "Moneda": "MONEDA",
  "Base imponible": "BASE 21%IVA",
};

/** Infer country from tax ID patterns */
function inferCountryFromTaxId(taxId: string): string {
  if (!taxId || !taxId.trim()) return "";
  const t = taxId.trim().toUpperCase();
  const spanishNif = /^[A-HJ-NPR-SUVW]\d{7}[A-Z0-9]$/;
  const spanishDni = /^\d{8}[A-Z]$/;
  const spanishNie = /^[XYZ]\d{7}[A-Z]$/;
  if (spanishNif.test(t) || spanishDni.test(t) || spanishNie.test(t)) return "España";
  if (/^[A-Z]{2}/.test(t)) return "Extranjero";
  return "";
}

interface DocEntity {
  type?: string;
  mentionText?: string;
  normalizedValue?: { text?: string };
}

/**
 * Extract entities from Document AI response and map to our schema.
 */
function mapDocumentToResult(document: { entities?: DocEntity[] } | null | undefined): DocumentAIExtractionResult | null {
  if (!document || !document.entities || document.entities.length === 0) return null;

  const fields: { key: string; value: string }[] = [];
  let emisor = "";
  let receptor = "";
  let country = "";

  for (const entity of document.entities) {
    const type = (entity.type || "").replace(/-/g, "_").toLowerCase();
    const value = entity.mentionText || entity.normalizedValue?.text || "";
    if (!value.trim()) continue;

    const key = ENTITY_TO_KEY[type] || type.replace(/_/g, " ");
    if (key && value) {
      fields.push({ key: key.charAt(0).toUpperCase() + key.slice(1), value: value.trim() });
    }
    if (type === "supplier_name" || type === "vendor_name") emisor = value.trim();
    if (type === "receiver_name" || type === "remit_to_name") receptor = value.trim();
    if ((type === "supplier_tax_id" || type === "vendor_tax_id") && !country) {
      country = inferCountryFromTaxId(value);
    }
  }

  if (fields.length === 0) return null;

  return {
    country: country || "Desconocido",
    documentType: "Factura",
    emisor: emisor || "-",
    receptor: receptor || "-",
    fields: fields.slice(0, 25),
  };
}

/** Pozuelo field order (Estructura Asesoría Pozuelo) */
const POZUELO_FIELD_ORDER = [
  "CIF PROVEEDORES", "CIF CLIENTES", "Nº FACTURA", "FECHA", "TOTAL",
  "BASE 0%IVA", "CUOTA 0%IVA", "BASE 4%IVA", "CUOTA 4%IVA",
  "BASE 10%IVA", "CUOTA 10%IVA", "BASE 21%IVA", "CUOTA 21%IVA",
  "%JE IRPF", "CUOTA IRPF", "MONEDA",
];

/** Map result fields to Pozuelo structure when excelStructure is asesoria-pozuelo */
function mapToPozueloFields(result: DocumentAIExtractionResult): DocumentAIExtractionResult {
  const byKey = new Map<string, string>();
  for (const f of result.fields) {
    const pozueloKey = TO_POZUELO_KEY[f.key] || f.key;
    if (f.value || !byKey.has(pozueloKey)) byKey.set(pozueloKey, f.value);
  }
  const ordered: { key: string; value: string }[] = [];
  for (const k of POZUELO_FIELD_ORDER) {
    const v = byKey.get(k);
    if (v != null && v !== "") ordered.push({ key: k, value: v });
  }
  for (const [k, v] of byKey) {
    if (!POZUELO_FIELD_ORDER.includes(k) && v) ordered.push({ key: k, value: v });
  }
  return { ...result, fields: ordered };
}

/**
 * Process a PDF buffer with Document AI Invoice Parser.
 * Returns null if processor is not configured or processing fails.
 */
export async function processInvoiceWithDocumentAI(
  buffer: Buffer,
  _fileName?: string,
  mimeType: string = "application/pdf",
  excelStructure?: string
): Promise<DocumentAIExtractionResult | null> {
  const processorId = process.env.DOCUMENT_AI_PROCESSOR_ID || process.env.DOCUMENT_AI_INVOICE_PROCESSOR_ID;
  const location = process.env.DOCUMENT_AI_LOCATION || "us";
  const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;

  if (!processorId || !projectId) {
    console.warn("Document AI: DOCUMENT_AI_PROCESSOR_ID and GCLOUD_PROJECT not configured");
    return null;
  }

  try {
    const apiEndpoint = `${location}-documentai.googleapis.com`;
    const client = new DocumentProcessorServiceClient({ apiEndpoint });
    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

    const [result] = await client.processDocument({
      name,
      rawDocument: {
        content: buffer,
        mimeType,
      },
    });

    const doc = result.document;
    const mapped = mapDocumentToResult(doc);
    if (mapped && excelStructure === "asesoria-pozuelo") {
      return mapToPozueloFields(mapped);
    }
    return mapped;
  } catch (err) {
    console.warn("Document AI processing failed:", err);
    return null;
  }
}

