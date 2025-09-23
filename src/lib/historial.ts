import { HistorialItem, HistorialItemSchema } from './validate-reclamacion';
import { v4 as uuidv4 } from 'uuid';

// Almacenamiento en memoria (en producción usar base de datos)
let historial: HistorialItem[] = [
  {
    id: '1',
    fechaISO: '2024-12-15T10:30:00Z',
    titulo: 'reclamacion_cantidades',
    documentos: 6,
    precision: 85,
    precio: 10,
    cuantia: 1850.00,
    estado: 'Completado',
    cauceRecomendado: 'monitorio'
  },
  {
    id: '2',
    fechaISO: '2024-12-10T14:20:00Z',
    titulo: 'reclamacion_cantidades',
    documentos: 4,
    precision: 60,
    precio: 10,
    cuantia: 1650.25,
    estado: 'Completado',
    cauceRecomendado: 'verbal'
  },
  {
    id: '3',
    fechaISO: '2024-12-05T09:15:00Z',
    titulo: 'reclamacion_cantidades',
    documentos: 8,
    precision: 95,
    precio: 10,
    cuantia: 1995.50,
    estado: 'Completado',
    cauceRecomendado: 'monitorio'
  }
];

export function agregarAlHistorial(item: Omit<HistorialItem, 'id'>): HistorialItem {
  const nuevoItem: HistorialItem = {
    ...item,
    id: uuidv4()
  };
  
  // Validar con Zod
  const validation = HistorialItemSchema.safeParse(nuevoItem);
  if (!validation.success) {
    throw new Error(`Error validando item de historial: ${validation.error.errors.map(e => e.message).join(', ')}`);
  }
  
  historial.unshift(nuevoItem); // Agregar al inicio
  return nuevoItem;
}

export function obtenerHistorial(): HistorialItem[] {
  return [...historial]; // Devolver copia
}

export function obtenerResumenHistorial(): {
  totalPrecios: number;
  totalDocumentos: number;
  totalReclamado: number;
  totalItems: number;
} {
  const completados = historial.filter(item => item.estado === 'Completado');
  
  return {
    totalPrecios: completados.reduce((sum, item) => sum + item.precio, 0),
    totalDocumentos: completados.reduce((sum, item) => sum + item.documentos, 0),
    totalReclamado: completados.reduce((sum, item) => sum + item.cuantia, 0),
    totalItems: completados.length
  };
}

export function obtenerItemPorId(id: string): HistorialItem | undefined {
  return historial.find(item => item.id === id);
}

export function actualizarEstadoItem(id: string, estado: HistorialItem['estado']): boolean {
  const item = historial.find(item => item.id === id);
  if (item) {
    item.estado = estado;
    return true;
  }
  return false;
}
