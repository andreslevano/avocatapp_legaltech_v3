'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserDoc } from '@/lib/auth';

interface CaseItem {
  id: string;
  title: string;
  ref: string;
  status: 'active' | 'urgent' | 'closed' | 'archived';
  client: string;
}

const STATUS_DOT: Record<string, string> = {
  active:   'bg-emerald-500',
  urgent:   'bg-red-500',
  closed:   'bg-[#6b6050]',
  archived: 'bg-[#3a3630]',
};

interface SidebarProps {
  userDoc: UserDoc;
}

export default function Sidebar({ userDoc }: SidebarProps) {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [search, setSearch] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    if (!db || !userDoc.uid) return;

    const q = query(
      collection(db, 'cases'),
      where('userId', '==', userDoc.uid),
      orderBy('updatedAt', 'desc'),
      limit(40)
    );

    getDocs(q)
      .then(snap => {
        setCases(
          snap.docs.map(d => ({
            id: d.id,
            ...(d.data() as Omit<CaseItem, 'id'>),
          }))
        );
      })
      .catch(() => {});
  }, [userDoc.uid]);

  const filtered = cases.filter(
    c =>
      !search ||
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.ref?.toLowerCase().includes(search.toLowerCase()) ||
      c.client?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="w-[220px] h-full bg-[#1e1c16] border-r border-[#2e2b20] flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#2e2b20]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-sans font-semibold tracking-widest uppercase text-[#6b6050]">
            Casos
          </span>
          <Link
            href="/cases/new"
            title="Nuevo caso"
            className="w-6 h-6 flex items-center justify-center rounded text-[#6b6050] hover:text-avocat-gold hover:bg-[#252218] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </Link>
        </div>
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#161410] border border-[#2e2b20] rounded-md px-2.5 py-1.5 text-[12px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/50 transition-colors"
        />
      </div>

      {/* Cases list */}
      <div className="flex-1 overflow-y-auto py-2">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[11px] text-[#3a3630]">
              {search ? 'Sin resultados' : 'Sin casos aún'}
            </p>
          </div>
        ) : (
          filtered.map(c => {
            const active = pathname === `/cases/${c.id}`;
            return (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className={[
                  'flex items-start gap-2.5 px-4 py-2.5 transition-colors group',
                  active ? 'bg-[#252218]' : 'hover:bg-[#1a1812]',
                ].join(' ')}
              >
                <span
                  className={`mt-[5px] w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[c.status] ?? STATUS_DOT.active}`}
                />
                <div className="min-w-0">
                  <p
                    className={`text-[12px] font-sans font-medium truncate leading-snug ${
                      active
                        ? 'text-[#e8d4a0]'
                        : 'text-[#c8c0ac] group-hover:text-[#e8d4a0]'
                    }`}
                  >
                    {c.title}
                  </p>
                  <p className="text-[10px] text-[#6b6050] truncate mt-0.5">{c.ref}</p>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Agent shortcut */}
      <div className="px-4 py-3 border-t border-[#2e2b20]">
        <Link
          href="/agent"
          className={[
            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[12px] font-sans font-medium transition-colors',
            pathname === '/agent'
              ? 'bg-avocat-gold text-white'
              : 'text-[#6b6050] hover:text-[#c8c0ac] hover:bg-[#252218]',
          ].join(' ')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          Agente IA
        </Link>
      </div>
    </aside>
  );
}
