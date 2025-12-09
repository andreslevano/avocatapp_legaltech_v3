import { z } from 'zod';

// Esquema para archivos OCR
export const ArchivoOCRSchema = z.object({
  filename: z.string(),
  docType: z.enum(['factura', 'albaran', 'pedido', 'contrato', 'burofax', 'otro']).optional(),
  text: z.string().optional(),
  amounts: z.array(z.object({
    label: z.string().optional(),
    value: z.number(),
    currency: z.string().default('EUR'),
    confidence: z.number().min(0).max(100).optional(),
  })).optional(),
  dateISO: z.string().optional(),
  confidence: z.number().min(0).max(100).optional(),
});

// Esquema para resumen OCR
export const ResumenOCRSchema = z.object({
  currency: z.string().default('EUR'),
  totalDetected: z.number().optional(),
  confidence: z.number().min(0).max(100).optional(),
});

// Esquema para la petición de reclamación de cantidades
export const ReclamacionCantidadSchema = z.object({
  // Campos del trabajador (aceptar ambos formatos)
  nombreTrabajador: z.string().optional(),
  dniTrabajador: z.string().optional(),
  domicilioTrabajador: z.string().optional(),
  telefonoTrabajador: z.string().optional(),
  emailTrabajador: z.string().optional(),
  
  // Campos de la empresa
  nombreEmpresa: z.string().optional(),
  cifEmpresa: z.string().optional(),
  domicilioEmpresa: z.string().optional(),
  telefonoEmpresa: z.string().optional(),
  emailEmpresa: z.string().optional(),
  
  // Datos del contrato
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
  salario: z.number().optional(),
  categoria: z.string().optional(),
  jornada: z.string().optional(),
  
  // Motivos y cantidades
  motivosReclamacion: z.array(z.string()).optional(),
  cantidadReclamada: z.number().optional(),
  fechaReclamacion: z.string().optional(),
  
  // Formato original (opcional)
  acreedor: z.object({
    nombre: z.string().min(1, 'El nombre del acreedor es requerido'),
    nif: z.string().optional(),
    domicilio: z.string().optional(),
    email: z.string().email('Email inválido').optional(),
    telefono: z.string().optional(),
  }).optional(),
  deudor: z.object({
    nombre: z.string().min(1, 'El nombre del deudor es requerido'),
    nif: z.string().optional(),
    domicilio: z.string().optional(),
  }).optional(),
  plaza: z.string().optional(),
  idioma: z.string().default('es-ES'),
  // OCR ya aplicado
  ocr: z.object({
    files: z.array(ArchivoOCRSchema),
    summary: ResumenOCRSchema.optional(),
  }),
  // Overrides de usuario (opcionales)
  cuantiaOverride: z.number().positive().optional(),
  hechos: z.string().optional(),
  base_negocial: z.string().optional(),
  docs: z.array(z.string()).default([]),
  intereses: z.object({
    tipo: z.enum(['legal', 'pacto']).optional(),
    desde: z.enum(['fecha', 'requerimiento', 'mora']).optional(),
    tipoPacto: z.number().optional(),
  }).optional(),
  viaPreferida: z.enum(['auto', 'monitorio', 'verbal']).default('auto'),
});

export type ReclamacionCantidadRequest = z.infer<typeof ReclamacionCantidadSchema>;

// Esquema estricto para la respuesta del modelo
export const ModelOutputSchema = z.object({
  version: z.literal('1.0'),
  jurisdiccion: z.literal('ES'),
  cauceRecomendado: z.enum(['monitorio', 'verbal']),
  competencia: z.object({
    fuero: z.string(),
    referencias: z.array(z.string()),
  }),
  encabezado: z.string(),
  partes: z.string(),
  hechos: z.array(z.string()),
  fundamentos: z.object({
    competencia: z.array(z.string()),
    legitimacion: z.array(z.string()),
    fondo: z.array(z.string()),
    interesesYCostas: z.array(z.string()),
  }),
  suplico: z.array(z.string()),
  otrosi: z.array(z.string()),
  documentos: z.array(z.string()),
  lugarFecha: z.string(),
  notasProSe: z.array(z.string()),
  citas: z.array(z.string()),
});

export type ModelOutput = z.infer<typeof ModelOutputSchema>;

// Esquema para documentos OCR
export const DocumentoOCRSchema = z.object({
  nombre: z.string(),
  contenido: z.string(),
  precision: z.number().min(0).max(100),
  cantidadDetectada: z.number().optional(),
  fechaDetectada: z.string().optional(),
  tipoDocumento: z.enum(['factura', 'albaran', 'contrato', 'presupuesto', 'otro']).optional(),
});

export type DocumentoOCR = z.infer<typeof DocumentoOCRSchema>;

// Esquema para historial de reclamaciones
export const HistorialItemSchema = z.object({
  id: z.string(),
  fechaISO: z.string(),
  titulo: z.string(),
  documentos: z.number(),
  precision: z.number().min(0).max(100),
  precio: z.number(),
  cuantia: z.number(),
  estado: z.enum(['Completado', 'Pendiente', 'Error']),
  cauceRecomendado: z.enum(['monitorio', 'verbal']).optional(),
});

export type HistorialItem = z.infer<typeof HistorialItemSchema>;
