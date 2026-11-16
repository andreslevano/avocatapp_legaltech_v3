// Clientes → bulk actions on selected clients: which clients each action applies to (the rest are
// skipped and reported). Pure, unit tested.
import { isValidEmail } from '@/lib/data-requests/core';
import type { DataRequestStatus } from '@/lib/data-requests/catalog';
import { IMPORT_MAX_REQUESTS } from './import';

export type BulkAction = 'request' | 'resend' | 'revoke' | 'activate' | 'deactivate' | 'export' | 'delete';

export interface BulkClient {
  id: string;
  name: string;
  email?: string;
  status?: 'active' | 'inactive';
  /** Effective request status (caducada once expired), or null without a request. */
  requestStatus: DataRequestStatus | null;
  requestId?: string;
  /** Number of cases linked to this client (any status). */
  cases: number;
}

export interface BulkPlan { targets: BulkClient[]; skipped: { client: BulkClient; reason: string }[] }

const pending = (s: DataRequestStatus | null) => s === 'enviada' || s === 'abierta';

export function planBulk(action: BulkAction, clients: BulkClient[]): BulkPlan {
  const targets: BulkClient[] = [];
  const skipped: BulkPlan['skipped'] = [];
  for (const c of clients) {
    const reason = skipReason(action, c);
    if (reason) skipped.push({ client: c, reason }); else targets.push(c);
  }
  if (action === 'request' && targets.length > IMPORT_MAX_REQUESTS) {
    for (const c of targets.splice(IMPORT_MAX_REQUESTS)) skipped.push({ client: c, reason: `Máximo ${IMPORT_MAX_REQUESTS} solicitudes por envío` });
  }
  return { targets, skipped };
}

function skipReason(action: BulkAction, c: BulkClient): string | null {
  switch (action) {
    case 'request':
      if (!c.email || !isValidEmail(c.email.trim().toLowerCase())) return 'Sin email válido';
      if (c.requestStatus === 'completada') return 'Ya envió sus datos';
      return null;
    case 'resend':
      if (!c.requestId || !c.requestStatus) return 'Sin solicitud';
      if (c.requestStatus === 'completada') return 'Ya envió sus datos';
      return null;
    case 'revoke':
      return c.requestId && pending(c.requestStatus) ? null : 'Sin solicitud pendiente';
    case 'activate':
      return c.status === 'active' ? 'Ya está activo' : null;
    case 'deactivate':
      return c.status === 'inactive' ? 'Ya está inactivo' : null;
    case 'delete':
      return c.cases > 0 ? `Tiene ${c.cases} caso${c.cases === 1 ? '' : 's'}` : null;
    case 'export':
      return null;
  }
}

/** "Solicitar datos a 3 clientes" — label for the confirm button. */
export function bulkLabel(action: BulkAction, n: number): string {
  const cl = `${n} cliente${n === 1 ? '' : 's'}`;
  return {
    request: `Solicitar datos a ${cl}`, resend: `Reenviar a ${cl}`, revoke: `Anular ${n} solicitud${n === 1 ? '' : 'es'}`,
    activate: `Marcar ${cl} como activos`, deactivate: `Marcar ${cl} como inactivos`, export: `Exportar ${cl}`, delete: `Eliminar ${cl}`,
  }[action];
}

export const hasPendingRequest = (c: BulkClient) => !!c.requestId && pending(c.requestStatus);
