'use client';

// Perfil → Notificaciones (F3): alert thresholds, daily email on/off and digest time.
// Saved on users/{uid}.notificationPrefs; the server reads it through normalizePrefs().

import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { DEFAULT_PREFS, THRESHOLD_CHOICES, normalizePrefs, type NotificationPrefs } from '@/lib/contracts/alerts';

const dayLabel = (n: number) => (n === 0 ? 'El mismo día' : n === 1 ? '1 día antes' : `${n} días antes`);

export default function NotificationSettingsCard() {
  const { userDoc } = useAppAuth();
  const initial = normalizePrefs((userDoc as unknown as { notificationPrefs?: unknown }).notificationPrefs);
  const [prefs, setPrefs] = useState<NotificationPrefs>(initial);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const toggle = (n: number) => setPrefs(p => {
    const has = p.thresholds.includes(n);
    const thresholds = has ? p.thresholds.filter(x => x !== n) : [...p.thresholds, n].sort((a, b) => b - a);
    return { ...p, thresholds: thresholds.length ? thresholds : p.thresholds };   // keep at least one
  });

  const save = async () => {
    if (!db || !userDoc.uid) return;
    setState('saving');
    try {
      await updateDoc(doc(db, 'users', userDoc.uid), { notificationPrefs: normalizePrefs(prefs) });
      setState('saved');
    } catch {
      setState('error');
    }
  };

  return (
    <div id="notificaciones" className="bg-surface border border-border rounded-2xl p-5 space-y-4 mt-4 scroll-mt-4">
      <div>
        <p className="text-label font-sans font-semibold uppercase tracking-widest text-text-muted">Notificaciones</p>
        <p className="text-caption font-sans text-text-muted mt-1">
          Avisos antes de que venzan tus contratos: fin del acuerdo, último día de preaviso y fin de la confidencialidad.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-caption text-text">Avisarme</p>
        <div className="flex flex-wrap gap-2">
          {THRESHOLD_CHOICES.map(n => {
            const on = prefs.thresholds.includes(n);
            return (
              <button key={n} type="button" onClick={() => toggle(n)} aria-pressed={on}
                className={`px-3 py-1.5 rounded-lg border text-caption transition-colors ${on ? 'border-accent-border text-accent-text bg-accent-subtle' : 'border-border text-text-muted hover:text-text'}`}>
                {dayLabel(n)}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex items-center gap-2 text-caption text-text">
        <input type="checkbox" checked={prefs.email} onChange={e => setPrefs(p => ({ ...p, email: e.target.checked }))} className="accent-accent" />
        Enviarme un resumen diario por email (solo los días con avisos)
      </label>

      {prefs.email && (
        <label className="flex items-center gap-2 text-caption text-text">
          Hora del resumen
          <select value={prefs.digestHour} onChange={e => setPrefs(p => ({ ...p, digestHour: Number(e.target.value) }))}
            className="bg-bg border border-border rounded-lg px-2 py-1.5 text-caption text-text  focus:border-accent-border">
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h} className="bg-bg">{String(h).padStart(2, '0')}:00</option>)}
          </select>
          <span className="text-caption text-text-muted">(hora de Madrid)</span>
        </label>
      )}

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={state === 'saving'}
          className="text-caption font-sans font-medium text-text bg-accent hover:bg-accent-hover disabled:opacity-40 px-3 py-1.5 rounded-md transition-colors">
          {state === 'saving' ? 'Guardando…' : 'Guardar avisos'}
        </button>
        {state === 'saved' && <span className="text-caption text-success-text">Guardado</span>}
        {state === 'error' && <span className="text-caption text-danger-text">No se pudo guardar</span>}
        {JSON.stringify(prefs) !== JSON.stringify(DEFAULT_PREFS) && (
          <button onClick={() => { setPrefs(DEFAULT_PREFS); setState('idle'); }} className="text-caption text-text-muted hover:text-text">
            Restablecer
          </button>
        )}
      </div>
    </div>
  );
}
