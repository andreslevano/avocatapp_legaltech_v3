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
import { canUseContracts } from '@/lib/contracts/config';
import { X } from 'lucide-react';

// ── Plan metadata ──────────────────────────────────────────────────

const PLAN_META: Record<UserPlan, { label: string; price: string; desc: string; color: string; bg: string }> = {
  Abogados: {
    label: 'Plan Abogados',
    price: '€75 / mes',
    desc:  'Dashboard, casos, clientes y agente IA profesional',
    color: 'text-accent-text',
    bg:    'bg-accent-subtle border-accent-border',
  },
  Estudiantes: {
    label: 'Plan Estudiantes',
    price: '€3 / escrito',
    desc:  'Tutor socrático, plantillas y material jurídico',
    color: 'text-info-text',
    bg:    'bg-info-subtle border-status-en-revision-border',
  },
  Autoservicio: {
    label: 'Plan Particular',
    price: '€50 / mes',
    desc:  'Asistente legal en lenguaje claro, sin tecnicismos',
    color: 'text-success-text',
    bg:    'bg-success-subtle border-status-a-tiempo-border',
  },
};

const COUNTRIES = [
  { label: 'España',    code: 'ES' },
  { label: 'Colombia',  code: 'CO' },
  { label: 'México',    code: 'MX' },
  { label: 'Chile',     code: 'CL' },
  { label: 'Perú',      code: 'PE' },
  { label: 'Ecuador',   code: 'EC' },
  { label: 'Argentina', code: 'AR' },
];

function countryDisplay(stored?: string): { label: string; code: string } | null {
  if (!stored) return null;
  const match = COUNTRIES.find(c => c.label.toLowerCase() === stored.toLowerCase());
  return match ?? { label: stored, code: '' };
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

  // Position: right of the trigger (desktop rail) OR above the bottom bar (mobile)
  const isFromBottomBar = anchorRect && anchorRect.top > window.innerHeight * 0.7;
  const panelStyle: React.CSSProperties = isFromBottomBar
    ? {
        // Mobile: float above the bottom bar, pinned to the right
        position: 'fixed',
        right:    8,
        bottom:   window.innerHeight - anchorRect!.top + 8,
        width:    288,
        zIndex:   9999,
      }
    : anchorRect
    ? {
        // Desktop: right of the rail button
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
    <div ref={panelRef} style={panelStyle} className="bg-surface border border-border rounded-2xl shadow-elevated overflow-hidden">

      {/* ── Avatar + name + email ── */}
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-accent-subtle border border-accent-border flex items-center justify-center flex-shrink-0">
          <span className="text-body-sm font-display font-semibold text-accent-text leading-none">{initials}</span>
        </div>
        <div className="min-w-0">
          <p className="text-small font-sans font-semibold text-text-heading truncate">
            {user.displayName || userDoc.displayName || 'Usuario'}
          </p>
          <p className="text-caption text-text-muted truncate">{user.email}</p>
        </div>
      </div>

      {/* ── Plan ── */}
      {planMeta && (
        <div className={`mx-4 my-3 px-3.5 py-3 rounded-xl border ${planMeta.bg}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-caption font-sans font-semibold ${planMeta.color}`}>{planMeta.label}</span>
            <span className={`text-caption font-display font-semibold ${planMeta.color}`}>{planMeta.price}</span>
          </div>
          <p className="text-caption text-text-muted leading-snug">{planMeta.desc}</p>
        </div>
      )}

      {/* ── País ── */}
      <div className="px-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="text-label font-sans font-semibold uppercase tracking-widest text-text-muted">País de operación</span>
          {!editingCountry && (
            <button
              onClick={() => { setSelectedCountry(userDoc.country ?? ''); setEditingCountry(true); }}
              className="text-caption text-accent-text hover:text-accent-text transition-colors"
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
              className="flex-1 bg-bg border border-border rounded-lg px-2.5 py-1.5 text-caption font-sans text-text  focus:border-accent-border"
            >
              <option value="">Seleccionar...</option>
              {COUNTRIES.map(c => (
                <option key={c.label} value={c.label} className="bg-bg">{c.label}</option>
              ))}
            </select>
            <button
              onClick={handleSaveCountry}
              disabled={savingCountry || !selectedCountry}
              className="px-2.5 py-1.5 rounded-lg bg-accent text-text-on-accent text-caption font-sans font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {savingCountry ? '…' : 'OK'}
            </button>
            <button onClick={() => setEditingCountry(false)} aria-label="Cancelar" className="px-2 py-1.5 rounded-lg text-text-muted hover:text-text transition-colors"><X size={14} aria-hidden /></button>
          </div>
        ) : (
          <p className="mt-1.5 text-small text-text">
            {country ? country.label : <span className="text-text-muted italic">No configurado</span>}
          </p>
        )}
      </div>

      {/* ── Navigation actions ── */}
      <div className="px-2 py-2 space-y-0.5">
        <Link
          href="/settings/perfil"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-caption font-sans text-text hover:text-text-heading hover:bg-surface-muted transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          Ver perfil completo
        </Link>

        {canUseContracts(userDoc.plan, user) && (
          <Link
            href="/legal-changes"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-caption font-sans text-text hover:text-text-heading hover:bg-surface-muted transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Cambios legales
          </Link>
        )}

        {(userDoc as unknown as { isAdmin?: boolean }).isAdmin === true && (
          <Link
            href="/admin/legal-changes"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-caption font-sans text-text hover:text-text-heading hover:bg-surface-muted transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
            </svg>
            Revisión legal <span className="ml-auto text-label uppercase tracking-widest text-text-muted">Admin</span>
          </Link>
        )}

        <Link
          href="/onboarding?mode=change"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-caption font-sans text-text hover:text-text-heading hover:bg-surface-muted transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          Cambiar plan
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-caption font-sans text-danger-text hover:bg-danger-subtle transition-colors text-left"
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
