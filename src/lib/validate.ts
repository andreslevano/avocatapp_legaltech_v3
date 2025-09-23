import { z } from 'zod';

// Esquemas de validación para la API
export const GenerateDocumentSchema = z.object({
  areaLegal: z.string().min(1, 'El área legal es requerida'),
  tipoEscrito: z.string().min(1, 'El tipo de escrito es requerido'),
  datosCliente: z.object({
    nombre: z.string().optional(),
    dni: z.string().optional(),
    direccion: z.string().optional(),
    telefono: z.string().optional(),
    email: z.string().email().optional(),
  }).optional(),
  hechos: z.string().min(10, 'Los hechos deben tener al menos 10 caracteres'),
  peticiones: z.string().min(5, 'Las peticiones deben tener al menos 5 caracteres'),
  tono: z.enum(['formal', 'informal', 'técnico']).default('formal'),
  plantillaId: z.string().optional(),
});

export const TemplateSchema = z.object({
  id: z.string().optional(),
  areaLegal: z.string().min(1),
  tipoEscrito: z.string().min(1),
  promptSistema: z.string().min(10),
  promptUsuario: z.string().min(10),
  variables: z.array(z.string()).default([]),
  activo: z.boolean().default(true),
});

export const LegalAreaSchema = z.object({
  id: z.string(),
  nombre: z.string().min(1),
  tipos: z.array(z.object({
    id: z.string(),
    nombre: z.string(),
    precio: z.number().positive(),
  })),
});

export const CaseSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  titulo: z.string().min(1),
  estado: z.enum(['abierto', 'en_proceso', 'cerrado']).default('abierto'),
  areaLegal: z.string(),
  documentos: z.array(z.string()).default([]),
  descripcion: z.string().optional(),
});

export const StripeCheckoutSchema = z.object({
  planId: z.string().min(1),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

// Tipos TypeScript derivados
export type GenerateDocumentRequest = z.infer<typeof GenerateDocumentSchema>;
export type Template = z.infer<typeof TemplateSchema>;
export type LegalArea = z.infer<typeof LegalAreaSchema>;
export type Case = z.infer<typeof CaseSchema>;
export type StripeCheckoutRequest = z.infer<typeof StripeCheckoutSchema>;

// Respuestas de API
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    hint: z.string().optional(),
  }).optional(),
});

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    hint?: string;
  };
};
