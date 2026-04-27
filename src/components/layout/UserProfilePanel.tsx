'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserPlan } from '@/lib/auth';
import { useAppAuth } from '@/contexts/AppAuthContext';

// ── Plan metadata ──────────────────────────────────────────────────

const PLAN_META: Record<UserPlan, { label: string; price: string; desc: string; color: string; bg: string }> = {
  Abogados: {
    label: 'Plan Abogados',
    price: '€75 / mes',
    desc:  'Dashboard, casos, clientes y agente IA profesional',
    color: 'text-avocat-gold',
    bg:    'bg-avocat-gold/10 border-avocat-gold/25',
  },
  Estudiantes: {
    label: 'Plan Estudiantes',
    price: '€3 / escrito',
    desc:  'Tutor socrático, plantillas y material jurídico',
    color: 'text-blue-400',
    bg:    'bg-blue-500/10 border-blue-500/20',
  },
  Autoservicio: {
    label: 'Plan Particular',
    price: '€50 / mes',
    desc:  'Asistente legal en lenguaje claro, sin tecnicismos',
    color: 'text-emerald-400',
    bg:    'bg-emerald-500/10 border-emerald-500/20',
  },
};

const COUNTRIES = [
  { label: 'España',    flag: '🇪🇸' },
  { label: 'Colombia',  flag: '🇨🇴' },
  { label: 'México',    flag: '🇲🇽' },
  { label: 'Chile',     flag: '🇨🇱' },
  { label: 'Perú',      flag: '🇵🇪' },
  { label: 'Ecuador',   flag: '🇪🇨' },
  { label: 'Argentina', flag: '🇦🇷' },
];

function countryDisplay(stored?: string): { label: string; flag: string } | null {
  if (!stored) return null;
  const match = COUNTRIES.find(c => c.label.toLowerCase() === stored.toLowerCase());
  return match ?? { label: stored, flag: '🌍' };
}

// ── Component ──────────────────────────────────────────────────────

interface UserProfilePanelProps {
  open: boolean;
  onClose: () => void;
  /** anchorRect: bounding rect of the trigger button, for positioning */
  anchorRect?: DOMRect | null;
}

export default function UserProfilePanel({ open, onClose, anchorRect }: UserProfilePanelProps) {
  const { user, userDoc } = useAppAuth();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  const [editingCountry,  setEditingCountry]  = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(userDoc.country ?? '');
  const [savingCountry,   setSavingCountry]   = useState(false);
  const [mounted,         setMounted]         = useState(false);

  // Portal requires document — avoid SSR
  useEffect(() => { setMounted(true); }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const planMeta = userDoc.plan ? PLAN_META[userDoc.plan] : null;
  const country  = countryDisplay(selectedCountry || userDoc.country);
  const initials = (user.displayName ?? user.email ?? 'U')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  // Position: right of the trigger button (anchor), or fallback fixed bottom-left
  const panelStyle: React.CSSProperties = anchorRect
    ? {
        position: 'fixed',
        left:     anchorRect.right + 12,
        bottom:   window.innerHeight - anchorRect.bottom,
        width:    288,
        zIndex:   9999,
      }
    : {
        position: 'fixed',
        left:     64,
        bottom:   20,
        width:    288,
        zIndex:   9999,
      };

  const handleSaveCountry = async () => {
    if (!db || !selectedCountry) return;
    setSavingCountry(true);
    try {
      await updateDoc(doc(db, 'users', userDoc.uid), {
        country: selectedCountry,
        updatedAt: serverTimestamp(),
      });
      setEditingCountry(false);
    } catch { /* silent */ }
    setSavingCountry(false);
  };

  const handleLogout = async () => {
    if (!auth) return;
    onClose();
    await signOut(auth);
    router.push('/login');
  };

  const panel = (
    <div ref={panelRef} style={panelStyle} className="bg-[#1e1c16] border border-[#2e2b20] rounded-2xl shadow-elevated overflow-hidden">

      {/* ── Avatar + name + email ── */}
      <div className="px-5 py-4 border-b border-[#2e2b20] flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-avocat-gold/20 border border-avocat-gold/40 flex items-center justify-center flex-shrink-0">
          <span className="text-[14px] font-display font-semibold text-avocat-gold leading-none">{initials}</span>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-sans font-semibold text-[#e8d4a0] truncate">
            {user.displayName || userDoc.displayName || 'Usuario'}
          </p>
          <p className="text-[11px] text-[#6b6050] truncate">{user.email}</p>
        </div>
      </div>

      {/* ── Plan ── */}
      {planMeta && (
        <div className={`mx-4 my-3 px-3.5 py-3 rounded-xl border ${planMeta.bg}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[12px] font-sans font-semibold ${planMeta.color}`}>{planMeta.label}</span>
            <span className={`text-[12px] font-display font-semibold ${planMeta.color}`}>{planMeta.price}</span>
          </div>
          <p className="text-[11px] text-[#6b6050] leading-snug">{planMeta.desc}</p>
        </div>
      )}

      {/* ── País ── */}
      <div className="px-4 pb-3 border-b border-[#2e2b20]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-sans font-semibold uppercase tracking-widest text-[#6b6050]">País de operación</span>
          {!editingCountry && (
            <button
              onClick={() => { setSelectedCountry(userDoc.country ?? ''); setEditingCountry(true); }}
              className="text-[10px] text-avocat-gold hover:text-avocat-gold-l transition-colors"
            >
              {country ? 'Cambiar' : 'Añadir'}
            </button>
          )}
        </div>
        {editingCountry ? (
          <div className="mt-2 flex items-center gap-2">
            <select
              value={selectedCountry}
              onChange={e => setSelectedCountry(e.target.value)}
              className="flex-1 bg-[#161410] border border-[#2e2b20] rounded-lg px-2.5 py-1.5 text-[12px] font-sans text-[#c8c0ac] focus:outline-none focus:border-avocat-gold/40"
            >
              <option value="">Seleccionar...</option>
              {COUNTRIES.map(c => (
                <option key={c.label} value={c.label} className="bg-[#161410]">{c.flag} {c.label}</option>
              ))}
            </select>
            <button
              onClick={handleSaveCountry}
              disabled={savingCountry || !selectedCountry}
              className="px-2.5 py-1.5 rounded-lg bg-avocat-gold text-white text-[11px] font-sans font-medium hover:bg-[#a07824] disabled:opacity-50 transition-colors"
            >
              {savingCountry ? '…' : 'OK'}
            </button>
            <button onClick={() => setEditingCountry(false)} className="px-2 py-1.5 rounded-lg text-[11px] text-[#6b6050] hover:text-[#c8c0ac] transition-colors">✕</button>
          </div>
        ) : (
          <p className="mt-1.5 text-[13px] text-[#c8c0ac]">
            {country ? `${country.flag} ${country.label}` : <span className="text-[#3a3630] italic">No configurado</span>}
          </p>
        )}
      </div>

      {/* ── Navigation actions ── */}
      <div className="px-2 py-2 space-y-0.5">
        <Link
          href="/profile"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] font-sans text-[#c8c0ac] hover:text-[#e8d4a0] hover:bg-[#252218] transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          Ver perfil completo
        </Link>

        <Link
          href="/onboarding"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] font-sans text-[#c8c0ac] hover:text-[#e8d4a0] hover:bg-[#252218] transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          Cambiar plan
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] font-sans text-red-400 hover:bg-red-500/10 transition-colors text-left"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
