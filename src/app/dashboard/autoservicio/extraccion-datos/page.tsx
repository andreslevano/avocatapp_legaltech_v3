'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useDashboardAuth } from '@/contexts/DashboardAuthContext';
import {
  saveUploadedFile,
  saveExtraccionDatosBatch,
  listExtraccionDatosUnprocessed,
  markUploadedFileProcessed,
  saveExtractedData,
  listExtractedData,
  deleteExtraccionFile,
  deleteExtractedDataAndFile,
  getUploadedFileStoragePath,
  getSignedUrl,
  type StoredExtraccionFile,
  type ExtractedDataDoc,
} from '@/lib/storage';
import { buildOcrPath } from '@/lib/storage-paths';
import { getExtraccionDatosExtractEndpoint } from '@/lib/api-endpoints';
import { extractTextFromPdfWithOcr, extractTextFromPdfWithOcrPerPage, extractTextFromPdfWithOcrForPageIndices, extractTextFromImageWithOcr } from '@/lib/ocr-pdf-client';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.webp'];

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints ?? 0) > 2;
}

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  uploadProgress: number;
  fileId?: string;
  storagePath?: string;
  downloadURL?: string;
  error?: string;
  aiProcessed?: boolean;
}

type ExtractedDocument = ExtractedDataDoc & { id: string };

type ExtractionFlag = 'white' | 'gray' | 'black';

/** Treat symbol-only or placeholder values as empty (not real data) */
function isSymbolOrPlaceholder(value: string): boolean {
  if (!value || !value.trim()) return true;
  const t = value.trim();
  if (/^[\-–—\.\s]+$/.test(t)) return true;
  if (/^(n\/a|n\.a\.|na|none|no data|sin datos|n\.d\.|nd)$/i.test(t)) return true;
  return false;
}

function hasRealValue(value: string): boolean {
  return !isSymbolOrPlaceholder(value ?? '');
}

function getExtractionFlag(doc: ExtractedDocument): ExtractionFlag {
  if (!doc.fields?.length) return 'black';
  const withValue = doc.fields.filter((f) => hasRealValue(f.value)).length;
  if (withValue === 0) return 'black';
  if (withValue === doc.fields.length) return 'white';
  return 'gray';
}

/** Normalize display/save: symbol-only becomes empty */
function normalizeValue(value: string): string {
  return isSymbolOrPlaceholder(value) ? '' : (value ?? '').trim();
}

function isFileAccepted(file: File): boolean {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return ACCEPTED_EXTENSIONS.includes(ext) || ACCEPTED_TYPES.includes(file.type);
}

type ExcelStructureType = 'estandar' | 'asesoria-pozuelo';

/** Sanitize sheet name for Excel (max 31 chars, no : \ / ? * [ ]) */
function sanitizeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, '_').slice(0, 31);
}

/** Estructura estándar: hojas por país-tipo, filas por campo (Documento, País, Tipo, Emisor, Receptor, Campo, Valor) */
function exportExcelEstandar(XLSX: any, wb: any, docs: ExtractedDocument[]): void {
  const groups = new Map<string, ExtractedDocument[]>();
  for (const doc of docs) {
    const key = `${doc.country || 'Desconocido'}|||${doc.documentType || 'Otro'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(doc);
  }
  groups.forEach((groupDocs, key) => {
    const [country, docType] = key.split('|||');
    const sheetName = sanitizeSheetName(`${country} - ${docType}`);
    const rows: Record<string, string>[] = [];
    groupDocs.forEach((doc) => {
      doc.fields.forEach((f) => {
        rows.push({
          Documento: doc.fileName,
          País: doc.country,
          Tipo: doc.documentType,
          Emisor: doc.emisor,
          Receptor: doc.receptor,
          Campo: f.key,
          Valor: f.value,
        });
      });
      if (doc.fields.length === 0) {
        rows.push({
          Documento: doc.fileName,
          País: doc.country,
          Tipo: doc.documentType,
          Emisor: doc.emisor,
          Receptor: doc.receptor,
          Campo: '',
          Valor: '',
        });
      }
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });
}

/** Map target column -> possible AI field keys (case-insensitive match). Estructura Asesoría Pozuelo order. */
const COL_TO_KEYS: Record<string, string[]> = {
  'CIF PROVEEDORES': ['cif proveedores', 'cif emisor', 'cif/nif emisor', 'cif', 'nif', 'vat number', 'tax id', 'identificación fiscal', 'tax identification'],
  'CIF CLIENTES': ['cif clientes', 'cif receptor', 'cif/nif receptor', 'cif cliente', 'nif cliente'],
  'Nº FACTURA': ['invoice number', 'numero factura', 'invoice_number', 'nº factura', 'invoice no', 'factura'],
  'FECHA': ['date', 'fecha', 'date of issue', 'fecha emision', 'fecha factura', 'invoice date'],
  'TOTAL': ['total', 'total amount', 'amount', 'importe total', 'amount due', 'total due'],
  'CIF': ['cif', 'nif', 'vat number', 'tax id', 'cif/nif', 'identificación fiscal', 'tax identification'],
  'BASE 0%IVA': ['base 0% iva', 'base 0%iva', 'base imponible 0%', 'base 0%'],
  'CUOTA 0%IVA': ['cuota 0% iva', 'cuota 0%iva', 'iva 0%'],
  'BASE 4%IVA': ['base 4% iva', 'base 4%iva', 'base imponible 4%', 'base 4%'],
  'CUOTA 4%IVA': ['cuota 4% iva', 'cuota 4%iva', 'iva 4%'],
  'BASE 10%IVA': ['base 10% iva', 'base 10%iva', 'base imponible 10%', 'base 10%'],
  'CUOTA 10%IVA': ['cuota 10% iva', 'cuota 10%iva', 'iva 10%'],
  'BASE 21%IVA': ['base 21% iva', 'base 21%iva', 'base imponible 21%', 'base 21%'],
  'CUOTA 21%IVA': ['cuota 21% iva', 'cuota 21%iva', 'iva 21%'],
  '%JE IRPF': ['%je irpf', 'irpf', 'retención irpf', 'irpf %'],
  'CUOTA IRPF': ['cuota irpf', 'retención', 'irpf amount'],
  'MONEDA': ['currency', 'moneda', 'tipo moneda', 'tipo de cambio'],
  'PAIS PROVEEDOR': ['pais proveedor', 'país proveedor', 'country of supplier', 'país emisor', 'country'],
  'PAIS CLIENTE': ['pais cliente', 'país cliente', 'country of customer', 'país receptor', 'country of buyer'],
};

function getMappedValue(fields: { key: string; value: string }[], targetCol: string): string {
  const keys = COL_TO_KEYS[targetCol];
  if (keys) {
    for (const f of fields) {
      const k = f.key.toLowerCase().trim();
      for (const key of keys) {
        if (k.includes(key) || key.includes(k)) return f.value;
      }
    }
  }
  const f = fields.find((f) => f.key.toLowerCase().replace(/\s/g, ' ') === targetCol.toLowerCase().replace(/\s/g, ' '));
  return f?.value ?? '';
}

/** Infer PAIS from CIF/NIF: Spanish IDs (A-H,J,P,Q,R,S,U,V,N,W + 8 digits, DNI, NIE X/Y/Z) = España; else use country */
function inferPaisFromCif(cif: string, fallbackCountry: string): string {
  if (!cif || !cif.trim()) return fallbackCountry || '';
  const t = cif.trim().toUpperCase();
  const spanishFirst = /^[A-HJ-NPR-SUVW]\d{7}[A-Z0-9]$/;
  const dni = /^\d{8}[A-Z]$/;
  const nie = /^[XYZ]\d{7}[A-Z]$/;
  if (spanishFirst.test(t) || dni.test(t) || nie.test(t) || /^[KLM]\d/.test(t)) return 'España';
  return fallbackCountry || 'Extranjero';
}

const BCE_LINK = 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html';

/** Estructura asesoría Pozuelo: dos hojas (Recibidas / Emitidas), columnas según EXCEL INTERSCAN */
function exportExcelAsesoriaPozuelo(
  XLSX: any,
  wb: any,
  docs: ExtractedDocument[],
  invoiceDirection: Record<string, 'recibida' | 'emitida'>,
  docUrls: Record<string, string>
): void {
  const colsProveedores = [
    'EMISOR', 'CIF PROVEEDORES', 'Nº FACTURA', 'FECHA', 'TOTAL',
    'BASE 0%IVA', 'CUOTA 0%IVA', 'BASE 4%IVA', 'CUOTA 4%IVA', 'BASE 10%IVA', 'CUOTA 10%IVA', 'BASE 21%IVA', 'CUOTA 21%IVA',
    '%JE IRPF', 'CUOTA IRPF', 'MONEDA', 'link conversion BCE', 'PAIS PROVEEDOR', 'LINK A FACTURA',
  ];
  const colsClientes = [
    'EMISOR', 'CIF CLIENTES', 'Nº FACTURA', 'FECHA', 'TOTAL',
    'BASE 0%IVA', 'CUOTA 0%IVA', 'BASE 4%IVA', 'CUOTA 4%IVA', 'BASE 10%IVA', 'CUOTA 10%IVA', 'BASE 21%IVA', 'CUOTA 21%IVA',
    '%JE IRPF', 'CUOTA IRPF', 'MONEDA', 'conversion euros s/fecha fact', 'PAIS CLIENTE', 'LINK A FACTURA',
  ];

  const recibidas = docs.filter((d) => (invoiceDirection[d.fileId] || 'recibida') === 'recibida');
  const emitidas = docs.filter((d) => invoiceDirection[d.fileId] === 'emitida');

  const toRowProveedores = (doc: ExtractedDocument): Record<string, string> => {
    const cif = getMappedValue(doc.fields, 'CIF PROVEEDORES') || getMappedValue(doc.fields, 'CIF');
    const paisProveedor = getMappedValue(doc.fields, 'PAIS PROVEEDOR') || inferPaisFromCif(cif, doc.country || '');
    return {
      'EMISOR': '',
      'CIF PROVEEDORES': cif,
      'Nº FACTURA': getMappedValue(doc.fields, 'Nº FACTURA'),
      'FECHA': getMappedValue(doc.fields, 'FECHA'),
      'TOTAL': getMappedValue(doc.fields, 'TOTAL'),
      'BASE 0%IVA': getMappedValue(doc.fields, 'BASE 0%IVA'),
      'CUOTA 0%IVA': getMappedValue(doc.fields, 'CUOTA 0%IVA'),
      'BASE 4%IVA': getMappedValue(doc.fields, 'BASE 4%IVA'),
      'CUOTA 4%IVA': getMappedValue(doc.fields, 'CUOTA 4%IVA'),
      'BASE 10%IVA': getMappedValue(doc.fields, 'BASE 10%IVA'),
      'CUOTA 10%IVA': getMappedValue(doc.fields, 'CUOTA 10%IVA'),
      'BASE 21%IVA': getMappedValue(doc.fields, 'BASE 21%IVA'),
      'CUOTA 21%IVA': getMappedValue(doc.fields, 'CUOTA 21%IVA'),
      '%JE IRPF': getMappedValue(doc.fields, '%JE IRPF'),
      'CUOTA IRPF': getMappedValue(doc.fields, 'CUOTA IRPF'),
      'MONEDA': getMappedValue(doc.fields, 'MONEDA') || 'EUR',
      'link conversion BCE': BCE_LINK,
      'PAIS PROVEEDOR': paisProveedor,
      'LINK A FACTURA': docUrls[doc.fileId] || '',
    };
  };

  const toRowClientes = (doc: ExtractedDocument): Record<string, string> => {
    const cif = getMappedValue(doc.fields, 'CIF CLIENTES') || getMappedValue(doc.fields, 'CIF');
    const paisCliente = getMappedValue(doc.fields, 'PAIS CLIENTE') || inferPaisFromCif(cif, doc.country || '');
    return {
      'EMISOR': '',
      'CIF CLIENTES': cif,
      'Nº FACTURA': getMappedValue(doc.fields, 'Nº FACTURA'),
      'FECHA': getMappedValue(doc.fields, 'FECHA'),
      'TOTAL': getMappedValue(doc.fields, 'TOTAL'),
      'BASE 0%IVA': getMappedValue(doc.fields, 'BASE 0%IVA'),
      'CUOTA 0%IVA': getMappedValue(doc.fields, 'CUOTA 0%IVA'),
      'BASE 4%IVA': getMappedValue(doc.fields, 'BASE 4%IVA'),
      'CUOTA 4%IVA': getMappedValue(doc.fields, 'CUOTA 4%IVA'),
      'BASE 10%IVA': getMappedValue(doc.fields, 'BASE 10%IVA'),
      'CUOTA 10%IVA': getMappedValue(doc.fields, 'CUOTA 10%IVA'),
      'BASE 21%IVA': getMappedValue(doc.fields, 'BASE 21%IVA'),
      'CUOTA 21%IVA': getMappedValue(doc.fields, 'CUOTA 21%IVA'),
      '%JE IRPF': getMappedValue(doc.fields, '%JE IRPF'),
      'CUOTA IRPF': getMappedValue(doc.fields, 'CUOTA IRPF'),
      'MONEDA': getMappedValue(doc.fields, 'MONEDA') || 'EUR',
      'conversion euros s/fecha fact': BCE_LINK,
      'PAIS CLIENTE': paisCliente,
      'LINK A FACTURA': docUrls[doc.fileId] || '',
    };
  };

  if (recibidas.length > 0) {
    const rows = recibidas.map(toRowProveedores);
    const ws = XLSX.utils.json_to_sheet(rows, { header: colsProveedores });
    XLSX.utils.book_append_sheet(wb, ws, 'FACTURAS RECIBIDAS PROVEEDORES');
  }
  if (emitidas.length > 0) {
    const rows = emitidas.map(toRowClientes);
    const ws = XLSX.utils.json_to_sheet(rows, { header: colsClientes });
    XLSX.utils.book_append_sheet(wb, ws, 'FACTURAS EMITIDAS CLIENTES');
  }
  if (recibidas.length === 0 && emitidas.length === 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Sin documentos seleccionados']]), 'Datos');
  }
}

async function exportSelectedToExcel(
  docs: ExtractedDocument[],
  structure: ExcelStructureType,
  invoiceDirection: Record<string, 'recibida' | 'emitida'>,
  userId: string
): Promise<void> {
  if (docs.length === 0) return;
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  if (structure === 'estandar') {
    exportExcelEstandar(XLSX, wb, docs);
  } else {
    const docUrls: Record<string, string> = {};
    const context = { userType: 'autoservicio' as const, documentType: 'extraccion-datos' as const };
    await Promise.all(
      docs.map(async (doc) => {
        try {
          let path = doc.storagePath ?? null;
          const isSplitItem = doc.fileId.includes('_p');
          const baseFileId = isSplitItem ? doc.fileId.replace(/_p\d+(_i\d+)?$/, '') : doc.fileId;
          const baseFileName = isSplitItem ? doc.fileName.replace(/\s*\(página\s+\d+\)(\s*\(factura\s+\d+\))?\s*$/i, '').trim() : doc.fileName;
          if (!path) path = await getUploadedFileStoragePath(baseFileId);
          if (!path) path = buildOcrPath(userId, context, baseFileId, baseFileName);
          docUrls[doc.fileId] = await getSignedUrl(path);
        } catch {
          docUrls[doc.fileId] = '';
        }
      })
    );
    exportExcelAsesoriaPozuelo(XLSX, wb, docs, invoiceDirection, docUrls);
  }
  const filename = structure === 'asesoria-pozuelo'
    ? `datos-extraidos-asesoria-pozuelo-${new Date().toISOString().slice(0, 10)}.xlsx`
    : `datos-extraidos-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

const STORAGE_CONTEXT = { userType: 'autoservicio' as const, documentType: 'extraccion-datos' as const };
const SOURCE = 'extraccion-datos';

type ProcessableItem = {
  fileId: string;
  fileName: string;
  size: number;
  isStored: boolean;
  storagePath?: string;
  downloadURL?: string;
  status?: 'uploading' | 'uploaded' | 'error';
  file?: File;
};

export default function ExtraccionDatosPage() {
  const user = useDashboardAuth();
  const [storedFiles, setStoredFiles] = useState<StoredExtraccionFile[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingStored, setIsLoadingStored] = useState(true);
  const [isLoadingExtracted, setIsLoadingExtracted] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentProcessingFile, setCurrentProcessingFile] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedDocument[]>([]);
  const [viewedDocId, setViewedDocId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewedDocUrl, setViewedDocUrl] = useState<string | null>(null);
  const [viewedDocUrlLoading, setViewedDocUrlLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedExtractedIds, setSelectedExtractedIds] = useState<Set<string>>(new Set());
  const [searchPending, setSearchPending] = useState('');
  const [searchExtracted, setSearchExtracted] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterEmisor, setFilterEmisor] = useState('');
  const [filterReceptor, setFilterReceptor] = useState('');
  const [filterExtractionFlag, setFilterExtractionFlag] = useState<ExtractionFlag | ''>('');
  const [editedFields, setEditedFields] = useState<Record<string, { key: string; value: string }[]>>({});
  const [savingDocId, setSavingDocId] = useState<string | null>(null);
  const [excelStructure, setExcelStructure] = useState<ExcelStructureType>('estandar');
  const [invoiceDirection, setInvoiceDirection] = useState<Record<string, 'recibida' | 'emitida'>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [splitByPage, setSplitByPage] = useState(true);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Load unprocessed documents and extracted data on mount
  useEffect(() => {
    if (!user?.uid) {
      setStoredFiles([]);
      setExtractedData([]);
      setIsLoadingStored(false);
      setIsLoadingExtracted(false);
      return;
    }
    let cancelled = false;
    setIsLoadingStored(true);
    setIsLoadingExtracted(true);
    listExtraccionDatosUnprocessed(user.uid)
      .then((list) => { if (!cancelled) setStoredFiles(list); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoadingStored(false); });
    listExtractedData(user.uid)
      .then((list) => {
        if (!cancelled) {
          setExtractedData(
            list.map((d) => ({
              ...d,
              id: d.fileId,
              fields: (d.fields ?? []).map((f) => ({ ...f, value: normalizeValue(f.value) })),
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoadingExtracted(false); });
    return () => { cancelled = true; };
  }, [user?.uid]);

  // Fetch document download URL when viewing a document
  useEffect(() => {
    if (!viewedDocId || !user?.uid) {
      setViewedDocUrl(null);
      setViewedDocUrlLoading(false);
      return;
    }
    const doc = extractedData.find((d) => d.id === viewedDocId);
    if (!doc) {
      setViewedDocUrl(null);
      setViewedDocUrlLoading(false);
      return;
    }
    let cancelled = false;
    setViewedDocUrlLoading(true);
    setViewedDocUrl(null);
    (async () => {
      try {
        let path = doc.storagePath ?? null;
        const isSplitItem = doc.fileId.includes('_p');
        const baseFileId = isSplitItem ? doc.fileId.replace(/_p\d+(_i\d+)?$/, '') : doc.fileId;
        const baseFileName = isSplitItem ? doc.fileName.replace(/\s*\(página\s+\d+\)(\s*\(factura\s+\d+\))?\s*$/i, '').trim() : doc.fileName;
        if (!path) path = await getUploadedFileStoragePath(baseFileId);
        if (!path) {
          const { buildOcrPath } = await import('@/lib/storage-paths');
          const context = { userType: 'autoservicio' as const, documentType: 'extraccion-datos' as const };
          path = buildOcrPath(user.uid, context, baseFileId, baseFileName);
        }
        const url = await getSignedUrl(path);
        if (!cancelled) setViewedDocUrl(url);
      } catch (err) {
        console.warn('Error obteniendo URL del documento:', err);
        if (!cancelled) setViewedDocUrl(null);
      } finally {
        if (!cancelled) setViewedDocUrlLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [viewedDocId, user?.uid, extractedData]);

  // Build processable list: stored (unprocessed) + session uploads that are uploaded and not processed
  const processableItems: ProcessableItem[] = useMemo(() => [
    ...storedFiles.map((f) => ({
      fileId: f.fileId,
      fileName: f.fileName,
      size: f.size,
      isStored: true,
      storagePath: f.storagePath,
      downloadURL: f.downloadURL,
    })),
    ...files
      .filter((f) => f.status === 'uploaded' && !f.aiProcessed && f.fileId)
      .map((f) => ({
        fileId: f.fileId!,
        fileName: f.name,
        size: f.file.size,
        isStored: false,
        storagePath: f.storagePath,
        downloadURL: f.downloadURL,
        status: f.status as 'uploaded',
        file: f.file,
      })),
  ], [storedFiles, files]);

  const processableItemsFiltered = useMemo(() => {
    if (!searchPending.trim()) return processableItems;
    const q = searchPending.toLowerCase().trim();
    return processableItems.filter((p) => p.fileName.toLowerCase().includes(q));
  }, [processableItems, searchPending]);

  const extractedDataFiltered = useMemo(() => {
    let list = extractedData;
    if (searchExtracted.trim()) {
      const q = searchExtracted.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.fileName.toLowerCase().includes(q) ||
          d.documentType.toLowerCase().includes(q) ||
          d.country.toLowerCase().includes(q) ||
          d.emisor.toLowerCase().includes(q) ||
          d.receptor.toLowerCase().includes(q) ||
          d.fields.some((f) => f.key.toLowerCase().includes(q) || f.value.toLowerCase().includes(q))
      );
    }
    if (filterCountry) list = list.filter((d) => d.country === filterCountry);
    if (filterType) list = list.filter((d) => d.documentType === filterType);
    if (filterEmisor) list = list.filter((d) => d.emisor.toLowerCase().includes(filterEmisor.toLowerCase()));
    if (filterReceptor) list = list.filter((d) => d.receptor.toLowerCase().includes(filterReceptor.toLowerCase()));
    if (filterExtractionFlag) {
      list = list.filter((d) => getExtractionFlag(d) === filterExtractionFlag);
    }
    return list;
  }, [extractedData, searchExtracted, filterCountry, filterType, filterEmisor, filterReceptor, filterExtractionFlag]);

  const filterOptions = useMemo(() => {
    const countries = [...new Set(extractedData.map((d) => d.country).filter(Boolean))].sort();
    const types = [...new Set(extractedData.map((d) => d.documentType).filter(Boolean))].sort();
    return { countries, types };
  }, [extractedData]);

  const toggleSelection = (fileId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size >= processableItemsFiltered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(processableItemsFiltered.map((p) => p.fileId)));
    }
  };

  const toggleExtractedSelection = (fileId: string) => {
    setSelectedExtractedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const toggleSelectAllExtracted = () => {
    if (selectedExtractedIds.size >= extractedDataFiltered.length) {
      setSelectedExtractedIds(new Set());
    } else {
      setSelectedExtractedIds(new Set(extractedDataFiltered.map((d) => d.fileId)));
    }
  };

  const getFieldsForDoc = (doc: ExtractedDocument) =>
    editedFields[doc.fileId] ?? doc.fields;

  const setFieldValue = (docId: string, fieldIndex: number, value: string) => {
    setEditedFields((prev) => {
      const doc = extractedData.find((d) => d.fileId === docId);
      if (!doc) return prev;
      const base = prev[docId] ?? doc.fields;
      const next = base.map((f, i) => (i === fieldIndex ? { ...f, value } : f));
      return { ...prev, [docId]: next };
    });
  };

  const hasEdits = (docId: string) => {
    const edited = editedFields[docId];
    if (!edited) return false;
    const orig = extractedData.find((d) => d.fileId === docId)?.fields ?? [];
    if (edited.length !== orig.length) return true;
    return edited.some((f, i) => f.value !== (orig[i]?.value ?? ''));
  };

  const handleSaveDoc = async (doc: ExtractedDocument) => {
    if (!user?.uid || !hasEdits(doc.fileId)) return;
    const fields = editedFields[doc.fileId];
    if (!fields) return;
    const normalizedFields = fields.map((f) => ({ ...f, value: normalizeValue(f.value) }));
    setSavingDocId(doc.fileId);
    try {
      await saveExtractedData(user.uid, doc.fileId, {
        fileName: doc.fileName,
        country: doc.country,
        documentType: doc.documentType,
        emisor: doc.emisor,
        receptor: doc.receptor,
        fields: normalizedFields,
        storagePath: doc.storagePath,
      });
      setExtractedData((prev) =>
        prev.map((d) =>
          d.fileId === doc.fileId ? { ...d, fields: normalizedFields } : d
        )
      );
      setEditedFields((prev) => {
        const next = { ...prev };
        delete next[doc.fileId];
        return next;
      });
    } finally {
      setSavingDocId(null);
    }
  };

  const allSelected = processableItemsFiltered.length > 0 && selectedIds.size === processableItemsFiltered.length;
  const allExtractedSelected = extractedDataFiltered.length > 0 && selectedExtractedIds.size === extractedDataFiltered.length;

  const uploadFiles = useCallback(
    async (fileList: UploadedFile[]) => {
      if (!user?.uid) {
        setFiles((prev) =>
          prev.map((f) => ({
            ...f,
            status: 'error' as const,
            error: 'Inicia sesión para subir archivos',
          }))
        );
        return;
      }
      setIsUploading(true);
      setUploadProgress(0);
      const total = fileList.length;
      const uploadedResults: Array<{
        fileId: string;
        fileName: string;
        storagePath: string;
        downloadURL: string;
        size: number;
        contentType: string;
      }> = [];

      for (let i = 0; i < total; i++) {
        const item = fileList[i];
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: 'uploading' as const, uploadProgress: 0 } : f
          )
        );
        try {
          const result = await saveUploadedFile(
            user.uid,
            item.file,
            SOURCE,
            undefined,
            STORAGE_CONTEXT,
            SOURCE
          );
          uploadedResults.push({
            fileId: result.fileId,
            fileName: item.file.name,
            storagePath: result.storagePath,
            downloadURL: result.downloadURL,
            size: item.file.size,
            contentType: item.file.type,
          });
          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? {
                    ...f,
                    status: 'uploaded' as const,
                    uploadProgress: 100,
                    fileId: result.fileId,
                    storagePath: result.storagePath,
                    downloadURL: result.downloadURL,
                  }
                : f
            )
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error al subir';
          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id ? { ...f, status: 'error' as const, error: msg } : f
            )
          );
        }
        setUploadProgress(Math.round(((i + 1) / total) * 100));
      }

      if (uploadedResults.length > 0) {
        try {
          await saveExtraccionDatosBatch(user.uid, uploadedResults);
        } catch (batchErr) {
          console.warn('Error guardando batch en Firestore:', batchErr);
        }
      }
      setIsUploading(false);
    },
    [user?.uid]
  );

  const addFiles = useCallback(
    (items: File[]) => {
      const newFiles: UploadedFile[] = items.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        name: file.name,
        status: 'pending',
        uploadProgress: 0,
      }));
      let updated: UploadedFile[] = [];
      setFiles((prev) => {
        updated = [...prev, ...newFiles];
        return updated;
      });
      // Run upload after state is scheduled - pass the full list so upload starts immediately
      queueMicrotask(() => uploadFiles(updated));
    },
    [uploadFiles]
  );

  const ensureUniqueImageName = useCallback((f: File): File => {
    const lower = f.name.toLowerCase();
    const isGeneric = /^image\.(jpg|jpeg|png|webp)$/.test(lower) || /^img_\d+\.(jpg|jpeg|png)$/.test(lower);
    if (!isGeneric) return f;
    const ts = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15);
    const ext = f.name.split('.').pop()?.toLowerCase() || 'jpg';
    return new File([f], `foto_${ts}.${ext}`, { type: f.type });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw = Array.from(e.dataTransfer.files).filter(isFileAccepted);
      const items = raw.map((f) => ensureUniqueImageName(f));
      if (items.length === 0) return;
      addFiles(items);
    },
    [addFiles, ensureUniqueImageName]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Array.from(e.target.files || []).filter(isFileAccepted);
      const items = raw.map((f) => ensureUniqueImageName(f));
      if (items.length === 0) return;
      addFiles(items);
      e.target.value = '';
    },
    [addFiles, ensureUniqueImageName]
  );

  const handleCameraCapture = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Array.from(e.target.files || []).filter(isFileAccepted);
      const items = raw.map((f) => ensureUniqueImageName(f));
      if (items.length > 0) addFiles(items);
      e.target.value = '';
    },
    [addFiles, ensureUniqueImageName]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const getBaseFileId = (fileId: string) => fileId.replace(/_p\d+(_i\d+)?$/, '');

  const handleRemoveSelected = async () => {
    const toRemovePending = processableItems.filter((p) => selectedIds.has(p.fileId));
    const toRemoveExtracted = extractedData.filter((d) => selectedExtractedIds.has(d.fileId));
    if ((toRemovePending.length === 0 && toRemoveExtracted.length === 0) || !user?.uid) return;
    setIsRemoving(true);
    for (const item of toRemovePending) {
      await deleteExtraccionFile(item.storagePath || '', item.fileId).catch(() => {});
      setStoredFiles((prev) => prev.filter((f) => f.fileId !== item.fileId));
      setFiles((prev) => prev.filter((f) => f.fileId !== item.fileId));
    }
    const remainingAfterDelete = extractedData.filter((d) => !selectedExtractedIds.has(d.fileId));
    for (const doc of toRemoveExtracted) {
      const baseFileId = getBaseFileId(doc.fileId);
      const othersWithSameBase = remainingAfterDelete.filter((d) => getBaseFileId(d.fileId) === baseFileId);
      const isLastForBase = othersWithSameBase.length === 0;
      let storagePathToDelete: string | undefined;
      let baseFileIdForUploaded: string | undefined;
      if (isLastForBase) {
        storagePathToDelete = doc.storagePath ?? (await getUploadedFileStoragePath(baseFileId));
        baseFileIdForUploaded = baseFileId;
      }
      await deleteExtractedDataAndFile(user.uid, doc.fileId, storagePathToDelete, baseFileIdForUploaded).catch(() => {});
      setExtractedData((prev) => prev.filter((d) => d.fileId !== doc.fileId));
    }
    setSelectedIds(new Set());
    setSelectedExtractedIds(new Set());
    setIsRemoving(false);
  };

  const startAnalysis = async () => {
    const toProcess = processableItems.filter((p) => selectedIds.has(p.fileId));
    if (toProcess.length === 0 || !user?.uid) return;
    setIsAnalyzing(true);
    const total = toProcess.length;

    for (let i = 0; i < total; i++) {
      const item = toProcess[i];
      setCurrentProcessingFile(item.fileName);
      setAnalysisProgress(Math.round(((i + 0.5) / total) * 100));

      const downloadURL = item.downloadURL ?? storedFiles.find((f) => f.fileId === item.fileId)?.downloadURL;
      const isPdf = item.fileName.toLowerCase().endsWith('.pdf');
      const isImage = /\.(jpg|jpeg|png|webp)$/i.test(item.fileName);
      const useSplitByPage = isPdf && splitByPage;

      let extractPayload: Record<string, unknown> = {
        downloadURL,
        fileName: item.fileName,
        splitByPage: useSplitByPage,
        excelStructure,
        multiInvoicePerPage: useSplitByPage,
      };

      if (isImage) {
        setOcrProgress(0);
        let imgFile: File | null = item.file ?? null;
        if (!imgFile && downloadURL) {
          try {
            const fetchRes = await fetch(downloadURL);
            const blob = await fetchRes.blob();
            imgFile = new File([blob], item.fileName, { type: blob.type || 'image/jpeg' });
          } catch {
            imgFile = null;
          }
        }
        if (imgFile) {
          try {
            const ocrText = await extractTextFromImageWithOcr(imgFile, (p) => setOcrProgress(p.percent));
            if (ocrText.trim().length > 20) {
              extractPayload = { preExtractedText: ocrText, fileName: item.fileName, splitByPage: false, excelStructure, multiInvoicePerPage: false };
            }
          } catch (ocrErr) {
            console.warn('OCR for image failed:', ocrErr);
          }
        }
        setOcrProgress(null);
      }

      let data: {
        country?: string;
        documentType?: string;
        emisor?: string;
        receptor?: string;
        fields?: { key: string; value: string }[];
        split?: boolean;
        items?: Array<{ country: string; documentType: string; emisor: string; receptor: string; fields: { key: string; value: string }[]; pageIndex?: number; subIndex?: number }>;
        totalPages?: number;
        batchComplete?: boolean;
        nextPageOffset?: number | null;
      } | null = null;

      const allItems: Array<{ country: string; documentType: string; emisor: string; receptor: string; fields: { key: string; value: string }[]; pageIndex?: number; subIndex?: number }> = [];
      let nextOffset: number | null = useSplitByPage ? 0 : null;
      let backendPageTexts: string[] | undefined;

      try {
        while (true) {
          const payload = nextOffset !== null ? { ...extractPayload, pageOffset: nextOffset, pageLimit: 25 } : extractPayload;
          const res = await fetch(getExtraccionDatosExtractEndpoint(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) break;
          const batch = await res.json();
          if (batch.pageTexts && Array.isArray(batch.pageTexts)) {
            backendPageTexts = batch.pageTexts;
          }
          if (batch.split && Array.isArray(batch.items)) {
            allItems.push(...batch.items);
            if (batch.batchComplete || batch.nextPageOffset == null) {
              data = { ...batch, items: allItems };
              break;
            }
            nextOffset = batch.nextPageOffset;
            setAnalysisProgress(Math.round(((i + 0.5) / total) * 100));
          } else {
            data = batch;
            break;
          }
        }
      } catch (err) {
        console.error('Error extrayendo con IA:', err);
      }

      const totalPages = data?.totalPages ?? 0;
      const pagesNeedingOcr: number[] = [];
      if (data && isPdf && useSplitByPage && totalPages > 0) {
        if (backendPageTexts && backendPageTexts.length >= totalPages) {
          for (let idx = 0; idx < totalPages; idx++) {
            const t = backendPageTexts[idx] ?? '';
            if (!t.trim() || t.trim().length < 20) pagesNeedingOcr.push(idx + 1);
          }
        } else {
          const pagesWithData = new Set<number>();
          for (const it of data.items ?? []) {
            const p = it.pageIndex ?? 0;
            if (p && (it.fields?.length ?? 0) > 0) pagesWithData.add(p);
          }
          for (let p = 1; p <= totalPages; p++) {
            if (!pagesWithData.has(p)) pagesNeedingOcr.push(p);
          }
        }
      }

      const hasNoUsefulData =
        data &&
        isPdf &&
        (
          ((data.fields?.length ?? 0) === 0 && !data.split && (data.documentType === 'Otro' || !data.emisor || data.emisor === '-' || !data.receptor || data.receptor === '-')) ||
          (data.split && Array.isArray(data.items) && data.items.every((it) => (it.fields?.length ?? 0) === 0))
        );

      const runOcrFallback = pagesNeedingOcr.length > 0 || hasNoUsefulData;
      if (runOcrFallback) {
        setOcrProgress(0);
        let pdfFile: File | null = item.file ?? null;
        if (!pdfFile && downloadURL) {
          try {
            const fetchRes = await fetch(downloadURL);
            const blob = await fetchRes.blob();
            pdfFile = new File([blob], item.fileName, { type: blob.type || 'application/pdf' });
          } catch {
            pdfFile = null;
          }
        }
        if (pdfFile) {
          try {
            if (useSplitByPage) {
              let mergedPageTexts: string[];
              if (pagesNeedingOcr.length > 0 && backendPageTexts && backendPageTexts.length >= totalPages) {
                const ocrResults = await extractTextFromPdfWithOcrForPageIndices(pdfFile, pagesNeedingOcr, (p) => setOcrProgress(p.percent));
                mergedPageTexts = backendPageTexts.map((t, idx) => {
                  const pageNum = idx + 1;
                  if (t.trim().length >= 20) return t;
                  return ocrResults.get(pageNum) ?? t;
                });
              } else {
                const pageTexts = await extractTextFromPdfWithOcrPerPage(pdfFile, (p) => setOcrProgress(p.percent));
                mergedPageTexts = pageTexts;
              }
              if (mergedPageTexts.some((t) => t.trim().length > 50)) {
                extractPayload = { preExtractedTextPerPage: mergedPageTexts, fileName: item.fileName, splitByPage: true, excelStructure, multiInvoicePerPage: true };
                const allItems2: typeof allItems = [];
                let nextOff: number | null = 0;
                while (true) {
                  const res2 = await fetch(getExtraccionDatosExtractEndpoint(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...extractPayload, pageOffset: nextOff, pageLimit: 25 }),
                  });
                  if (!res2.ok) break;
                  const b = await res2.json();
                  if (b.split && Array.isArray(b.items)) {
                    allItems2.push(...b.items);
                    if (b.batchComplete || b.nextPageOffset == null) {
                      data = { ...b, items: allItems2, totalPages: mergedPageTexts.length };
                      break;
                    }
                    nextOff = b.nextPageOffset;
                  } else {
                    data = b;
                    break;
                  }
                }
              }
            } else {
              const ocrText = await extractTextFromPdfWithOcr(pdfFile, (p) => setOcrProgress(p.percent));
              if (ocrText.trim().length > 50) {
                extractPayload = { preExtractedText: ocrText, fileName: item.fileName, splitByPage: false, excelStructure, multiInvoicePerPage: false };
                const res2 = await fetch(getExtraccionDatosExtractEndpoint(), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(extractPayload),
                });
                if (res2.ok) data = await res2.json();
              }
            }
          } catch (ocrErr) {
            console.warn('OCR fallback failed:', ocrErr);
          }
        }
        setOcrProgress(null);
      }

      const itemsToSave: Array<{
        fileId: string;
        fileName: string;
        country: string;
        documentType: string;
        emisor: string;
        receptor: string;
        fields: { key: string; value: string }[];
      }> = [];

      const normalizeFields = (fields: { key: string; value: string }[]) =>
        (fields ?? []).slice(0, 25).map((f) => ({ ...f, value: normalizeValue(f.value) }));

      if (data?.split && Array.isArray(data.items) && data.items.length > 0) {
        for (const it of data.items) {
          const subId = it.subIndex ? `${item.fileId}_p${it.pageIndex ?? 0}_i${it.subIndex}` : `${item.fileId}_p${it.pageIndex ?? 0}`;
          const pageLabel = it.subIndex ? `página ${it.pageIndex ?? '?'} (factura ${it.subIndex})` : `página ${it.pageIndex ?? '?'}`;
          itemsToSave.push({
            fileId: subId,
            fileName: `${item.fileName} (${pageLabel})`,
            country: it.country ?? 'Desconocido',
            documentType: it.documentType ?? 'Otro',
            emisor: it.emisor ?? '-',
            receptor: it.receptor ?? '-',
            fields: normalizeFields(it.fields ?? []),
          });
        }
      } else if (data) {
        itemsToSave.push({
          fileId: item.fileId,
          fileName: item.fileName,
          country: data.country ?? 'Desconocido',
          documentType: data.documentType ?? 'Otro',
          emisor: data.emisor ?? '-',
          receptor: data.receptor ?? '-',
          fields: normalizeFields(data.fields ?? []),
        });
      }

      await markUploadedFileProcessed(item.fileId).catch(() => {});
      for (const doc of itemsToSave) {
        await saveExtractedData(user.uid, doc.fileId, {
          fileName: doc.fileName,
          country: doc.country,
          documentType: doc.documentType,
          emisor: doc.emisor,
          receptor: doc.receptor,
          fields: doc.fields,
          storagePath: item.storagePath,
        }).catch(() => {});
      }
      setExtractedData((prev) => {
        const idsToReplace = new Set(itemsToSave.map((d) => d.fileId));
        const without = prev.filter((d) => !idsToReplace.has(d.fileId));
        return [...without, ...itemsToSave.map((d) => ({ ...d, id: d.fileId }))];
      });

      setAnalysisProgress(Math.round(((i + 1) / total) * 100));
      await new Promise((r) => setTimeout(r, 200));
    }

    setStoredFiles((prev) => prev.filter((f) => !selectedIds.has(f.fileId)));
    setFiles((prev) =>
      prev.map((f) =>
        f.fileId && selectedIds.has(f.fileId) ? { ...f, aiProcessed: true } : f
      )
    );
    setSelectedIds(new Set());
    setCurrentProcessingFile(null);
    setOcrProgress(null);
    setIsAnalyzing(false);
    listExtraccionDatosUnprocessed(user.uid)
      .then((list) => setStoredFiles(list))
      .catch(() => {});
  };

  const canStartAnalysis =
    processableItems.length > 0 &&
    selectedIds.size > 0 &&
    !isAnalyzing;

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 relative">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-h1 text-text-primary mb-2">Extracción de Datos</h1>
        <p className="text-body text-text-secondary mb-8">
          Sube documentos PDF, Word, PowerPoint o Excel para extraer datos estructurados con IA.
        </p>

        {!user && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
            <p className="text-sm text-amber-700">
              Inicia sesión para subir archivos. Los documentos se guardan en tu espacio personal siguiendo la jerarquía UID → autoservicio → extracción de datos.
            </p>
          </div>
        )}

        {/* 1. Documentos: drop zone + uploaded list */}
        <div className="bg-card overflow-hidden shadow rounded-lg border border-border mb-8">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-h2 text-text-primary">Documentos</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">Estructura Excel:</span>
                <select
                  value={excelStructure}
                  onChange={(e) => setExcelStructure(e.target.value as ExcelStructureType)}
                  className="rounded-lg border border-border bg-surface-muted/10 px-3 py-1.5 text-sm text-text-primary focus:border-sidebar focus:outline-none focus:ring-1 focus:ring-sidebar"
                >
                  <option value="estandar">1. Estructura estándar</option>
                  <option value="asesoria-pozuelo">2. Estructura asesoría Pozuelo</option>
                </select>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={(e) => { if (!(e.target as HTMLElement).closest('[data-camera-trigger]')) inputRef.current?.click(); }}
              className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:bg-surface-muted/10 hover:border-hover transition-colors"
            >
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraCapture}
                className="hidden"
              />
              <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
                <div className="w-16 h-16 bg-surface-muted/30 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                {isMobileDevice() && (
                  <button
                    type="button"
                    data-camera-trigger
                    onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sidebar/10 hover:bg-sidebar/20 text-sidebar font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7" />
                    </svg>
                    Tomar foto
                  </button>
                )}
              </div>
              <p className="text-text-primary font-medium mb-1">
                Arrastra archivos aquí o haz clic para seleccionar
              </p>
              <p className="text-sm text-text-secondary">
                PDF, Word, PowerPoint, Excel, imágenes (.jpg, .png)
              </p>
            </div>

            {/* Upload progress bar */}
            {files.length > 0 && isUploading && (
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-text-secondary">Subida de archivos</span>
                  <span className="font-medium text-text-primary">{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-surface-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sidebar transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Document list: stored (unprocessed) + session uploads */}
            <div className="mt-6 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h4 className="font-medium text-text-primary">
                  Documentos pendientes de procesar ({processableItemsFiltered.length})
                </h4>
                <div className="flex-1 min-w-[200px]">
                    <input
                      type="search"
                      placeholder="Buscar por nombre o título..."
                      value={searchPending}
                    onChange={(e) => setSearchPending(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface-muted/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-sidebar focus:outline-none focus:ring-1 focus:ring-sidebar"
                  />
                </div>
              </div>
              {isLoadingStored ? (
                <p className="text-sm text-text-secondary">Cargando documentos...</p>
              ) : processableItemsFiltered.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  {searchPending.trim()
                    ? 'No hay resultados para la búsqueda.'
                    : 'No hay documentos pendientes. Sube archivos arriba o aparecerán aquí los que ya están en tu almacenamiento.'}
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-4 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary hover:text-text-primary">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-border text-sidebar focus:ring-sidebar"
                      />
                      Seleccionar todos
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary hover:text-text-primary">
                      <input
                        type="checkbox"
                        checked={splitByPage}
                        onChange={(e) => setSplitByPage(e.target.checked)}
                        className="rounded border-border text-sidebar focus:ring-sidebar"
                      />
                      Extraer cada página por separado (PDFs con múltiples facturas)
                    </label>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {processableItemsFiltered.map((item) => (
                      <div
                        key={item.fileId}
                        className="flex items-center gap-3 p-3 rounded-lg bg-surface-muted/10"
                      >
                        <label className="flex items-center shrink-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.fileId)}
                            onChange={() => toggleSelection(item.fileId)}
                            className="rounded border-border text-sidebar focus:ring-sidebar"
                          />
                        </label>
                        <svg className="w-5 h-5 text-text-secondary shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-text-primary truncate block">{item.fileName}</span>
                          <span className="text-xs text-text-secondary">
                            ({(item.size / 1024).toFixed(1)} KB)
                            {item.isStored && ' · En almacenamiento'}
                          </span>
                        </div>
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0">
                          Pendiente de IA
                        </span>
                      </div>
                    ))}
                    {/* Session files still uploading or in queue */}
                    {files
                      .filter((f) => f.status !== 'uploaded' || f.aiProcessed)
                      .map((f) => (
                        <div
                          key={f.id}
                          className={`flex items-center gap-3 p-3 rounded-lg ${
                            f.status === 'error' ? 'bg-red-50 dark:bg-red-900/10' : 'bg-surface-muted/10'
                          }`}
                        >
                          <div className="w-5 shrink-0" />
                          <svg className="w-5 h-5 text-text-secondary shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium text-text-primary truncate block">{f.name}</span>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {f.status === 'uploading' && (
                                <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                  Subiendo...
                                </span>
                              )}
                              {f.status === 'pending' && (
                                <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-surface-muted/50 text-text-secondary border border-border">
                                  En cola
                                </span>
                              )}
                              {f.status === 'error' && f.error && (
                                <span className="text-xs text-red-600 dark:text-red-400">{f.error}</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(f.id);
                            }}
                            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 shrink-0"
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 2. Floating action buttons: vertical stack, black with white icons */}
            {(processableItems.length > 0 || extractedData.length > 0) && (
          <div className="fixed top-24 right-8 z-50 flex flex-col items-center gap-2">
            {selectedExtractedIds.size > 0 && (
              <button
                onClick={async () => {
                  const selected = extractedData.filter((d) => selectedExtractedIds.has(d.fileId));
                  if (!user?.uid) return;
                  setIsExporting(true);
                  try {
                    await exportSelectedToExcel(selected, excelStructure, invoiceDirection, user.uid);
                  } finally {
                    setIsExporting(false);
                  }
                }}
                disabled={isExporting}
                className="group w-12 h-12 rounded-full bg-black hover:bg-gray-800 text-white shadow-lg flex items-center justify-center transition-all disabled:opacity-50"
                aria-label="Descargar datos en Excel"
                title="Descargar datos en Excel"
              >
                {isExporting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                <span className="absolute right-full mr-3 whitespace-nowrap px-3 py-1.5 bg-black text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Descargar datos en Excel
                </span>
              </button>
            )}
            <button
              onClick={startAnalysis}
              disabled={!canStartAnalysis}
              className="group w-12 h-12 rounded-full bg-black hover:bg-gray-800 text-white shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              aria-label="Extraer datos con IA"
              title="Extraer datos con IA"
            >
              {isAnalyzing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09L9 18.75z" />
                </svg>
              )}
              <span className="absolute right-full mr-3 whitespace-nowrap px-3 py-1.5 bg-black text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Extraer datos con IA
              </span>
            </button>
            {(selectedIds.size > 0 || selectedExtractedIds.size > 0) && (
              <button
                onClick={handleRemoveSelected}
                disabled={isRemoving}
                className="group w-12 h-12 rounded-full bg-black hover:bg-gray-800 text-white shadow-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                aria-label="Eliminar seleccionados"
                title="Eliminar seleccionados"
              >
                {isRemoving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
                <span className="absolute right-full mr-3 whitespace-nowrap px-3 py-1.5 bg-black text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Eliminar seleccionados
                </span>
              </button>
            )}
          </div>
        )}

        {/* 5. Analysis progress bar */}
        {isAnalyzing && (
          <div className="bg-card overflow-hidden shadow rounded-lg border border-border mb-8">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-h2 text-text-primary mb-4">Análisis en curso</h2>
              <p className="text-sm text-text-secondary mb-4">
                {currentProcessingFile
                  ? `Procesando: ${currentProcessingFile}${ocrProgress !== null ? ' (OCR para documento escaneado…)' : ''}`
                  : 'El proceso está analizando los documentos con IA para extraer datos (uno por uno).'}
              </p>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-secondary">Progreso</span>
                <span className="font-medium text-text-primary">
                  {ocrProgress !== null ? `${Math.round(ocrProgress)}%` : `${analysisProgress}%`}
                </span>
              </div>
              <div className="h-3 bg-surface-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sidebar transition-all duration-300"
                  style={{ width: `${ocrProgress !== null ? ocrProgress : analysisProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 6. Extracted data display (like attached image) */}
        {(extractedData.length > 0 || isLoadingExtracted) && !isAnalyzing && (
          <div className="bg-card overflow-hidden shadow rounded-lg border border-border">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-h2 text-text-primary mb-4">
                Datos Extraídos de Documentos
                {extractedData.length > 0 && (
                  <span className="ml-2 text-base font-normal text-text-secondary">
                    ({extractedData.length} documento{extractedData.length !== 1 ? 's' : ''}
                    {(() => {
                      const completos = extractedData.filter((d) => getExtractionFlag(d) === 'white').length;
                      const parcial = extractedData.filter((d) => getExtractionFlag(d) === 'gray').length;
                      const sinDatos = extractedData.filter((d) => getExtractionFlag(d) === 'black').length;
                      return ` · ${completos} completos · ${parcial} parcial · ${sinDatos} sin datos`;
                    })()})
                  </span>
                )}
              </h2>

              {extractedData.length > 0 && (
                <div className="mb-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="search"
                      placeholder="Buscar por texto o título..."
                      value={searchExtracted}
                      onChange={(e) => setSearchExtracted(e.target.value)}
                      className="flex-1 min-w-[180px] rounded-lg border border-border bg-surface-muted/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-sidebar focus:outline-none focus:ring-1 focus:ring-sidebar"
                    />
                    <select
                      value={filterCountry}
                      onChange={(e) => setFilterCountry(e.target.value)}
                      className="rounded-lg border border-border bg-surface-muted/10 px-3 py-1.5 text-sm text-text-primary focus:border-sidebar focus:outline-none"
                    >
                      <option value="">Todos los países</option>
                      {filterOptions.countries.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="rounded-lg border border-border bg-surface-muted/10 px-3 py-1.5 text-sm text-text-primary focus:border-sidebar focus:outline-none"
                    >
                      <option value="">Todos los tipos</option>
                      {filterOptions.types.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Filtrar emisor"
                      value={filterEmisor}
                      onChange={(e) => setFilterEmisor(e.target.value)}
                      className="min-w-[120px] rounded-lg border border-border bg-surface-muted/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-sidebar focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Filtrar receptor"
                      value={filterReceptor}
                      onChange={(e) => setFilterReceptor(e.target.value)}
                      className="min-w-[120px] rounded-lg border border-border bg-surface-muted/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-sidebar focus:outline-none"
                    />
                    <select
                      value={filterExtractionFlag}
                      onChange={(e) => setFilterExtractionFlag(e.target.value as ExtractionFlag | '')}
                      className="rounded-lg border border-border bg-surface-muted/10 px-3 py-1.5 text-sm text-text-primary focus:border-sidebar focus:outline-none"
                      title="Filtrar por completitud de extracción"
                    >
                      <option value="">Todas las extracciones</option>
                      <option value="white">Completa (blanco)</option>
                      <option value="gray">Parcial (gris)</option>
                      <option value="black">Sin datos (negro)</option>
                    </select>
                  </div>
                </div>
              )}

              {isLoadingExtracted ? (
                <p className="text-sm text-text-secondary">Cargando datos extraídos...</p>
              ) : extractedDataFiltered.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  {extractedData.length === 0
                    ? 'Aún no hay documentos procesados. Selecciona documentos arriba y pulsa "Extraer datos con IA".'
                    : 'No hay resultados para los filtros aplicados.'}
                </p>
              ) : (
              <div className="space-y-3">
                {/* Seleccionar todos - full width above list and viewer */}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary hover:text-text-primary">
                    <input
                      type="checkbox"
                      checked={allExtractedSelected}
                      onChange={toggleSelectAllExtracted}
                      className="rounded border-border text-sidebar focus:ring-sidebar"
                    />
                    Seleccionar todos
                  </label>
                </div>
                {/* List and viewer - aligned so viewer starts with first item */}
                <div
                  className={`flex gap-4 transition-all duration-300 ${
                    viewedDocId ? 'flex-col lg:flex-row' : ''
                  }`}
                >
                  {/* List - full width when no viewer, half when viewer open */}
                  <div
                    className={`space-y-3 transition-all duration-300 ${
                      viewedDocId ? 'flex-1 min-w-0 lg:min-w-[300px] lg:max-w-[50%]' : 'w-full'
                    }`}
                  >
                    <div className="space-y-3 max-h-[400px] lg:max-h-[500px] overflow-y-auto">
                    {extractedDataFiltered.map((doc) => (
                      <div
                        key={doc.id}
                        className={`bg-card border rounded-lg overflow-hidden transition-colors ${
                          viewedDocId === doc.id ? 'border-sidebar ring-1 ring-sidebar' : 'border-border'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2 p-4 hover:bg-surface-muted/5">
                          <label className="flex items-center shrink-0 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedExtractedIds.has(doc.fileId)}
                              onChange={() => toggleExtractedSelection(doc.fileId)}
                              className="rounded border-border text-sidebar focus:ring-sidebar"
                            />
                          </label>
                          <span
                            className="shrink-0 inline-flex"
                            title={
                              getExtractionFlag(doc) === 'white'
                                ? 'Extracción completa'
                                : getExtractionFlag(doc) === 'gray'
                                  ? 'Extracción parcial'
                                  : 'Sin datos extraídos'
                            }
                          >
                            <svg
                              className="w-4 h-4"
                              viewBox="0 0 24 24"
                              fill={
                                getExtractionFlag(doc) === 'white'
                                  ? '#ffffff'
                                  : getExtractionFlag(doc) === 'gray'
                                    ? '#9ca3af'
                                    : '#1f2937'
                              }
                              stroke="#000000"
                              strokeWidth="1"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" />
                            </svg>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedId(expandedId === doc.id ? null : doc.id);
                            }}
                            className="flex-shrink-0 p-1 rounded hover:bg-surface-muted/20 transition-colors"
                            aria-label={expandedId === doc.id ? 'Colapsar datos' : 'Expandir datos'}
                          >
                            <svg
                              className={`w-5 h-5 text-text-secondary transition-transform ${expandedId === doc.id ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-text-primary truncate">{doc.fileName}</p>
                            <p className="text-sm text-text-secondary">
                              {doc.fields.length} campo{doc.fields.length !== 1 ? 's' : ''} extraído{doc.fields.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                            {excelStructure === 'asesoria-pozuelo' && (
                              <select
                                value={invoiceDirection[doc.fileId] || 'recibida'}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setInvoiceDirection((prev) => ({ ...prev, [doc.fileId]: e.target.value as 'recibida' | 'emitida' }));
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded border border-border bg-surface-muted/10 px-2 py-0.5 text-xs text-text-primary focus:border-sidebar focus:outline-none"
                              >
                                <option value="recibida">Recibida</option>
                                <option value="emitida">Emitida</option>
                              </select>
                            )}
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200">
                              {doc.country || '-'}
                            </span>
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-muted/30 text-text-primary border border-border">
                              {doc.documentType}
                            </span>
                            <span className="text-xs text-text-secondary hidden sm:inline">Emisor: {doc.emisor || '-'}</span>
                            <span className="text-xs text-text-secondary hidden sm:inline">Receptor: {doc.receptor || '-'}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewedDocId(viewedDocId === doc.id ? null : doc.id);
                              }}
                              className="text-sm font-medium text-text-primary hover:text-text-secondary"
                            >
                              Ver
                            </button>
                          </div>
                        </div>
                        {expandedId === doc.id && (
                          <div className="border-t border-border px-4 py-4 bg-surface-muted/5">
                            <div className="space-y-2">
                              {getFieldsForDoc(doc).map((field, i) => (
                                <div key={i} className="flex justify-between gap-4 items-center text-sm py-2 border-b border-border/50 last:border-0">
                                  <span className="text-text-secondary font-medium shrink-0">{field.key}:</span>
                                  <input
                                    type="text"
                                    value={isSymbolOrPlaceholder(field.value) ? '' : field.value}
                                    onChange={(e) => setFieldValue(doc.fileId, i, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex-1 min-w-0 max-w-[70%] rounded border border-border bg-surface-muted/10 px-2 py-1 text-text-primary text-right focus:border-sidebar focus:outline-none focus:ring-1 focus:ring-sidebar"
                                  />
                                </div>
                              ))}
                            </div>
                            {hasEdits(doc.fileId) && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveDoc(doc);
                                  }}
                                  disabled={savingDocId === doc.fileId}
                                  className="p-2 rounded-lg bg-sidebar text-white hover:bg-sidebar/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  aria-label="Guardar cambios"
                                  title="Guardar cambios"
                                >
                                  {savingDocId === doc.fileId ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    </div>
                  </div>

                  {/* Document detail panel - PDF/document viewer, aligned with first list item */}
                {viewedDocId && (() => {
                  const doc = extractedDataFiltered.find((d) => d.id === viewedDocId);
                  if (!doc) return null;
                  const baseName = doc.fileName.replace(/\s*\(página\s+\d+\)(\s*\(factura\s+\d+\))?\s*$/i, '').trim();
                  const isPdf = baseName.toLowerCase().endsWith('.pdf');
                  return (
                    <div className="fixed inset-0 z-50 lg:relative lg:inset-auto flex flex-col bg-card lg:bg-surface-muted/10 rounded-none lg:rounded-lg border-0 lg:border border-border overflow-hidden lg:flex-1 lg:min-w-[300px] lg:max-w-[50%] shadow-xl lg:shadow-none">
                      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                        <h3 className="font-medium text-text-primary truncate pr-2">{doc.fileName}</h3>
                        <button
                          onClick={() => setViewedDocId(null)}
                          className="shrink-0 w-10 h-10 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-muted/30 hover:text-text-primary transition-colors touch-manipulation"
                          aria-label="Cerrar"
                        >
                          <svg className="w-6 h-6 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex-1 min-h-0 flex flex-col p-4 overflow-hidden">
                        {viewedDocUrlLoading ? (
                          <div className="flex-1 flex items-center justify-center text-text-secondary">
                            <span className="animate-pulse">Cargando documento...</span>
                          </div>
                        ) : viewedDocUrl ? (
                          <>
                            <div className="flex-1 min-h-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                              {isPdf ? (
                                <iframe
                                  src={`${viewedDocUrl}#toolbar=1`}
                                  title={doc.fileName}
                                  className="w-full h-full min-h-[300px] lg:min-h-[400px] border-0"
                                />
                              ) : (
                                <img
                                  src={viewedDocUrl}
                                  alt={doc.fileName}
                                  className="max-w-full max-h-full w-auto h-auto object-contain"
                                  style={{ maxHeight: 'min(70vh, 600px)' }}
                                />
                              )}
                            </div>
                            <a
                              href={viewedDocUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={doc.fileName}
                              className="mt-3 inline-flex items-center gap-2 text-sm text-sidebar hover:underline"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              {isPdf ? 'Descargar PDF' : 'Descargar documento'}
                            </a>
                          </>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
                            No se pudo cargar el documento.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
                </div>
              </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
