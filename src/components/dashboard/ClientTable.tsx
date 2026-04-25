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
}

export default function ClientTable({ clients }: ClientTableProps) {
  const active = clients.filter(c => c.status === 'active').slice(0, 10);

  return (
    <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#2e2b20]">
        <h3 className="text-[13px] font-sans font-semibold text-[#e8d4a0]">Clientes activos</h3>
      </div>

      {active.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-[12px] text-[#6b6050]">Sin clientes registrados aún</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] font-sans">
            <thead>
              <tr className="border-b border-[#2e2b20]">
                {['Cliente', 'Casos activos', 'Último caso'].map(h => (
                  <th
                    key={h}
                    className="text-left px-5 py-2.5 text-[11px] font-semibold tracking-widest uppercase text-[#6b6050]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2e2b20]">
              {active.map(c => (
                <tr key={c.id} className="hover:bg-[#252218] transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-[#c8c0ac]">{c.name}</p>
                    <p className="text-[10px] text-[#6b6050] mt-0.5">{c.email}</p>
                  </td>
                  <td className="px-5 py-3 text-[#c8c0ac]">{c.activeCases}</td>
                  <td className="px-5 py-3 text-[#6b6050]">{formatDate(c.lastCaseDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
