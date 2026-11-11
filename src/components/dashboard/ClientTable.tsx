import type { ClientDoc } from '@/lib/firestore';
import type { Timestamp } from 'firebase/firestore';

function formatDate(ts: Timestamp | null): string {
  if (!ts) return '—';
  const secs = (ts as unknown as { seconds: number }).seconds ?? 0;
  return new Date(secs * 1000).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface ClientTableProps {
  clients: ClientDoc[];
  activeCasesByClientId?: Record<string, number>;
}

export default function ClientTable({ clients, activeCasesByClientId = {} }: ClientTableProps) {
  const active = clients.filter(c => c.status === 'active').slice(0, 10);

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-small font-sans font-semibold text-text-heading">Clientes activos</h3>
      </div>

      {active.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-caption text-text-muted">Sin clientes registrados aún</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-caption font-sans">
            <thead>
              <tr className="border-b border-border">
                {['Cliente', 'Casos activos', 'Último caso'].map(h => (
                  <th
                    key={h}
                    className="text-left px-5 py-2.5 text-label font-semibold tracking-widest uppercase text-text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {active.map(c => (
                <tr key={c.id} className="hover:bg-surface-muted transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-text">{c.name}</p>
                    <p className="text-caption text-text-muted mt-0.5">{c.email}</p>
                  </td>
                  <td className="px-5 py-3 text-text">{activeCasesByClientId[c.id] ?? 0}</td>
                  <td className="px-5 py-3 text-text-muted">{formatDate(c.lastCaseDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
