'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { OPEN_SETTINGS_EVENT, readConsent, saveConsent } from '@/lib/consent';

// Avocat DS v4 CookieBanner — spec: design-system/v4/components/CookieBanner.md
// "Rechazar todas" and "Aceptar todas" carry equal weight (same variant, same row).
export default function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [ads, setAds] = useState(false);

  useEffect(() => {
    const c = readConsent();
    if (!c) setOpen(true);
    const reopen = () => {
      const cur = readConsent();
      setAnalytics(!!cur?.analytics);
      setAds(!!cur?.ads);
      setSettings(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, reopen);
  }, []);

  if (!open) return null;

  const choose = (choice: { analytics: boolean; ads: boolean }) => {
    saveConsent(choice);
    setOpen(false);
    setSettings(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      className="fixed inset-x-0 bottom-0 z-toast p-4 sm:p-6 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-lg border border-border bg-surface text-text shadow-lg p-5">
        <h2 id="cookie-title" className="font-sans text-h4 text-text-heading mb-1">Cookies</h2>
        <p className="text-body-sm text-text-muted">
          Usamos cookies técnicas para que la web funcione. Con tu permiso, también usamos Microsoft Clarity (analítica)
          y Google Ads (publicidad) para medir y mejorar Avocat. Puedes cambiar tu elección en cualquier momento desde
          «Configurar cookies» en el pie de página. <Link href="/cookies" className="text-accent-text underline">Política de cookies</Link>
        </p>

        {settings && (
          <fieldset className="mt-4 space-y-3">
            <legend className="sr-only">Categorías de cookies</legend>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked disabled className="mt-1 h-4 w-4 accent-accent" />
              <span className="text-body-sm"><b className="font-medium">Técnicas</b> — necesarias, siempre activas.</span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} className="mt-1 h-4 w-4 accent-accent" />
              <span className="text-body-sm"><b className="font-medium">Analíticas</b> — Microsoft Clarity: cómo se usa la web.</span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={ads} onChange={e => setAds(e.target.checked)} className="mt-1 h-4 w-4 accent-accent" />
              <span className="text-body-sm"><b className="font-medium">Publicidad</b> — Google Ads: medir campañas y conversiones.</span>
            </label>
          </fieldset>
        )}

        <div className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center gap-2">
          {settings ? (
            <Button variant="ghost" size="sm" onClick={() => choose({ analytics, ads })}>Guardar selección</Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setSettings(true)}>Configurar</Button>
          )}
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="secondary" className="flex-1 sm:flex-none" onClick={() => choose({ analytics: false, ads: false })}>Rechazar todas</Button>
            <Button variant="secondary" className="flex-1 sm:flex-none" onClick={() => choose({ analytics: true, ads: true })}>Aceptar todas</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
