import { z } from 'zod';

// Esquema de entrada para Acción de Tutela
export const TutelaRequestSchema = z.object({
  vulnerador: z.string().min(1, 'El vulnerador es requerido'),
  hechos: z.string().min(10, 'Los hechos deben ser detallados (mínimo 10 caracteres)'),
  derecho: z.enum([
    'vida',
    'salud', 
    'minimo_vital',
    'peticion',
    'debido_proceso',
    'igualdad',
    'educacion',
    'libertad_expresion',
    'intimidad',
    'habeas_data'
  ], {
    errorMap: () => ({ message: 'Derecho fundamental inválido' })
  }),
  peticiones: z.string().min(5, 'Las peticiones son requeridas'),
  medidasProvisionales: z.boolean().optional().default(false),
  anexos: z.array(z.string()).optional().default([]),
  ciudad: z.string().optional().default('Bogotá'),
  idioma: z.literal('es-CO').optional().default('es-CO'),
  userId: z.string().optional()
});

// Esquema de respuesta del modelo de IA
export const TutelaModelSchema = z.object({
  version: z.literal('1.0'),
  jurisdiccion: z.literal('CO'),
  competencia: z.object({
    juez: z.string(),
    razones: z.array(z.string())
  }),
  encabezado: z.string(),
  partes: z.string(),
  hechos: z.array(z.string()),
  fundamentos: z.object({
    competencia: z.array(z.string()),
    legitimacion: z.array(z.string()),
    subsidiariedad: z.array(z.string()),
    inmediatez: z.array(z.string()),
    fondo: z.array(z.string())
  }),
  peticiones: z.array(z.string()),
  medidaProvisional: z.array(z.string()).optional(),
  pruebas: z.array(z.string()),
  anexos: z.array(z.string()),
  juramento: z.string(),
  lugarFecha: z.string(),
  notas: z.array(z.string())
});

export type TutelaRequest = z.infer<typeof TutelaRequestSchema>;
export type TutelaModel = z.infer<typeof TutelaModelSchema>;

