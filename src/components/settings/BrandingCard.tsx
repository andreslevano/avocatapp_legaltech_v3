'use client';

// Perfil → "Identidad de marca de tus documentos": logo, header colours and font applied to every
// document Avocat generates. Model, validation and defaults: src/lib/branding.ts.

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { Check, ImagePlus, RotateCcw, Trash2 } from 'lucide-react';
import { db, storage } from '@/lib/firebase';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { useDocBranding, logoDataUri } from '@/hooks/useDocBranding';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { buildDocHtml } from '@/lib/doc-html';
import {
  COLOR_PRESETS, DEFAULT_BRANDING, FONT_CATALOG, FONT_IDS, LOGO_MAX_BYTES, LOGO_MAX_WIDTH_PX, LOGO_TYPES,
  googleFontsHref, isHex6, logoStoragePath, lowContrastOnWhite, resolveBranding, withLogoSrc,
  type Branding, type FontId, type LogoMime,
} from '@/lib/branding';

const SAMPLE_MD = `# CONTRATO DE PRESTACIÓN DE SERVICIOS

En Madrid, a la fecha indicada en la cabecera.

## REUNIDOS

De una parte, **la parte prestadora**, y de otra, **la parte cliente**, que se reconocen capacidad suficiente para obligarse.

## CLÁUSULAS

**Primera. Objeto.** La parte prestadora se obliga a prestar los servicios descritos en el anexo, con la diligencia profesional exigible.

**Segunda. Duración.** El presente contrato tendrá una duración de doce meses desde su firma.
`;
const FONT_SAMPLE = 'Contrato de prestación de servicios — Cláusula primera';

const LABEL = 'block text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-2';
const INPUT = 'w-full min-h-touch sm:min-h-0 bg-bg border border-border-strong rounded-lg px-3.5 py-2.5 text-small font-sans text-text focus:border-accent-border transition-colors';

/** Resize to ≤ 600 px wide. JPEG stays JPEG; PNG and WebP become PNG (keeps transparency, and the
 *  server outputs — pdfkit/docx — can't embed WebP). */
async function prepareLogo(file: File): Promise<{ blob: Blob; mime: LogoMime; width: number; height: number }> {
  if (!(file.type in LOGO_TYPES) || /\.svg$/i.test(file.name)) throw new Error('Formato no admitido: usa PNG, JPG o WebP.');
  if (file.size > LOGO_MAX_BYTES) throw new Error('El logo pesa más de 1 MB.');
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, LOGO_MAX_WIDTH_PX / bmp.width);
  const width = Math.max(1, Math.round(bmp.width * scale));
  const height = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  const mime: LogoMime = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
  const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, mime, 0.92));
  if (!blob) throw new Error('No se pudo procesar la imagen.');
  if (blob.size > LOGO_MAX_BYTES) throw new Error('El logo sigue pesando más de 1 MB tras reducirlo. Prueba con un JPG.');
  return { blob, mime, width, height };
}

const blobToDataUri = (b: Blob) => new Promise<string>((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => res(String(fr.result));
  fr.onerror = () => rej(fr.error);
  fr.readAsDataURL(b);
});

export default function BrandingCard() {
  const { userDoc } = useAppAuth();
  const { stored, owner } = useDocBranding();
  const [draft, setDraft] = useState<Branding>(stored);
  const [dirty, setDirty] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<'logo' | 'save' | 'reset' | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Follow the saved branding until the user starts editing.
  useEffect(() => { if (!dirty) setDraft(stored); }, [stored, dirty]);

  // Saved logo → data URI for the sandboxed preview iframe.
  useEffect(() => {
    let alive = true;
    if (draft.logoUrl) logoDataUri(draft.logoUrl).then(src => { if (alive && src) setLogoPreview(src); });
    else setLogoPreview(null);
    return () => { alive = false; };
  }, [draft.logoUrl]);

  // Font samples: load the Google-hosted catalog fonts on this page once.
  useEffect(() => {
    const links = FONT_IDS.map(id => googleFontsHref(FONT_CATALOG[id])).filter((h): h is string => !!h)
      .filter(href => !document.querySelector(`link[data-branding-font][href="${href}"]`))
      .map(href => {
        const l = document.createElement('link');
        l.rel = 'stylesheet'; l.href = href; l.dataset.brandingFont = '';
        document.head.appendChild(l);
        return l;
      });
    return () => links.forEach(l => l.remove());
  }, []);

  const update = (patch: Partial<Branding>) => { setDraft(d => ({ ...d, ...patch })); setDirty(true); setSaved(false); };
  const setColor = (k: 'primary' | 'secondary', v: string) => update({ colors: { ...draft.colors, [k]: v } });

  const colorsValid = isHex6(draft.colors.primary) && isHex6(draft.colors.secondary);
  const preview = useMemo(() => {
    const safe = colorsValid ? draft : { ...draft, colors: stored.colors };
    const r = withLogoSrc(resolveBranding({ ...owner, branding: safe }), logoPreview);
    return buildDocHtml(SAMPLE_MD, 'Vista previa', undefined, undefined, { branding: r })
      .replace('</head>', '<style>html{zoom:.62}body{margin:0;padding:36px 44px}</style></head>');
  }, [draft, stored.colors, owner, logoPreview, colorsValid]);

  const persist = async (b: Branding) => {
    if (!db) throw new Error('Sin conexión.');
    const { updatedAt: _u, ...rest } = b;
    await updateDoc(doc(db, 'users', userDoc.uid), { branding: { ...rest, updatedAt: serverTimestamp() }, updatedAt: serverTimestamp() });
  };

  const removeLogoFile = async (path: string | null) => {
    if (!path || !storage) return;
    await deleteObject(storageRef(storage, path)).catch(() => undefined); // already gone is fine
  };

  const onFile = async (file: File | undefined) => {
    if (!file || !storage) return;
    setError(''); setBusy('logo');
    try {
      const { blob, mime, width, height } = await prepareLogo(file);
      const path = logoStoragePath(userDoc.uid, LOGO_TYPES[mime]);
      const r = storageRef(storage, path);
      await uploadBytes(r, blob, { contentType: mime, cacheControl: 'public, max-age=3600' });
      const url = await getDownloadURL(r);
      if (stored.logoPath && stored.logoPath !== path) await removeLogoFile(stored.logoPath);
      // The logo is saved at once (the file is already replaced); colours/font wait for "Guardar".
      const logo = { logoUrl: url, logoPath: path, logoWidth: width, logoHeight: height };
      await persist({ ...stored, ...logo });
      setDraft(d => ({ ...d, ...logo }));
      setLogoPreview(await blobToDataUri(blob));
    } catch (e) {
      setError((e as Error).message || 'No se pudo subir el logo.');
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeLogo = async () => {
    setError(''); setBusy('logo');
    try {
      const none = { logoUrl: null, logoPath: null, logoWidth: 0, logoHeight: 0 };
      await persist({ ...stored, ...none });
      await removeLogoFile(stored.logoPath);
      setDraft(d => ({ ...d, ...none }));
    } catch {
      setError('No se pudo quitar el logo. Intenta de nuevo.');
    } finally { setBusy(null); }
  };

  const save = async () => {
    if (!colorsValid) { setError('Revisa los colores: usa el formato #RRGGBB.'); return; }
    setError(''); setBusy('save');
    try {
      await persist({ ...draft, logoUrl: stored.logoUrl, logoPath: stored.logoPath, logoWidth: stored.logoWidth, logoHeight: stored.logoHeight });
      setDirty(false); setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Error al guardar. Intenta de nuevo.');
    } finally { setBusy(null); }
  };

  const reset = async () => {
    setError(''); setBusy('reset');
    try {
      await persist(DEFAULT_BRANDING);
      await removeLogoFile(stored.logoPath);
      setDraft(DEFAULT_BRANDING); setDirty(false);
    } catch {
      setError('No se pudo restablecer. Intenta de nuevo.');
    } finally { setBusy(null); }
  };

  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragOver(false); onFile(e.dataTransfer.files[0]); };
  const font = FONT_CATALOG[draft.font];

  return (
    <section aria-labelledby="branding-title" className="bg-surface border border-border rounded-2xl p-5 mt-4 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="branding-title" className="text-label font-sans font-semibold uppercase tracking-widest text-text-muted">
            Identidad de marca de tus documentos
          </h2>
          <p className="text-caption font-sans text-text-muted mt-1">
            Se aplica a todos los documentos que generas en Avocat: Word, PDF, vista previa y envíos a firma.
          </p>
        </div>
        {saved && (
          <span role="status" className="text-caption font-sans text-success-text flex items-center gap-1.5 flex-shrink-0">
            <Check size={16} aria-hidden /> Guardado
          </span>
        )}
      </div>

      {/* Logo */}
      <div>
        <span id="logo-label" className={LABEL}>Logo de la cabecera</span>
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`rounded-xl border border-dashed p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors ${dragOver ? 'border-accent-border bg-accent-subtle' : 'border-border-strong bg-bg'}`}
        >
          {logoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoPreview} alt="Logo actual" className="max-h-16 max-w-48 object-contain bg-surface-raised rounded-md p-2 border border-border" />
          ) : (
            <ImagePlus size={24} aria-hidden className="text-text-muted" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-small font-sans text-text">
              {logoPreview ? 'Arrastra otra imagen para sustituirlo' : 'Arrastra tu logo aquí'}
            </p>
            <p className="text-caption font-sans text-text-muted">PNG, JPG o WebP · máximo 1 MB · se reduce a 600 px de ancho</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef} id="logo-file" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only"
              aria-labelledby="logo-label" onChange={e => onFile(e.target.files?.[0])}
            />
            <Button variant="secondary" size="sm" className="min-h-touch sm:min-h-0" loading={busy === 'logo'}
              onClick={() => fileRef.current?.click()}>
              {logoPreview ? 'Cambiar logo' : 'Seleccionar imagen'}
            </Button>
            {draft.logoUrl && (
              <Button variant="ghost" size="sm" className="min-h-touch sm:min-h-0" disabled={busy !== null} onClick={removeLogo}>
                <Trash2 size={16} aria-hidden /> Quitar logo
              </Button>
            )}
          </div>
        </div>

        <fieldset className="mt-3">
          <legend className="text-caption font-sans text-text-muted mb-1.5">Posición del logo</legend>
          <div className="inline-flex rounded-lg border border-border-strong overflow-hidden">
            {(['left', 'right'] as const).map(pos => (
              <label key={pos} className={`min-h-touch sm:min-h-0 px-4 py-2 text-small font-sans cursor-pointer flex items-center focus-within:ring-2 focus-within:ring-accent ${draft.logoPosition === pos ? 'bg-accent-subtle text-accent-text' : 'bg-bg text-text'}`}>
                <input type="radio" name="logo-position" value={pos} checked={draft.logoPosition === pos}
                  onChange={() => update({ logoPosition: pos })} className="sr-only" />
                {pos === 'left' ? 'Izquierda' : 'Derecha'}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Colours */}
      <div className="space-y-3">
        <span className={LABEL}>Colores de la cabecera</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Paletas sugeridas">
          {COLOR_PRESETS.map(p => {
            const active = draft.colors.primary === p.primary && draft.colors.secondary === p.secondary;
            return (
              <button key={p.id} type="button" aria-pressed={active}
                onClick={() => update({ colors: { primary: p.primary, secondary: p.secondary } })}
                className={`min-h-touch sm:min-h-0 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-caption font-sans transition-colors ${active ? 'border-accent-border bg-accent-subtle text-accent-text' : 'border-border bg-bg text-text hover:border-border-strong'}`}>
                <span aria-hidden className="flex">
                  <span className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: p.primary }} />
                  <span className="w-4 h-4 rounded-full border border-border -ml-1" style={{ backgroundColor: p.secondary }} />
                </span>
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {([
            ['primary', 'Color principal', 'Nombre de la empresa y línea de la cabecera'],
            ['secondary', 'Color secundario', 'NIF, fecha y pie de página'],
          ] as const).map(([k, label, hint]) => {
            const value = draft.colors[k];
            const valid = isHex6(value);
            return (
              <div key={k}>
                <label htmlFor={`color-${k}`} className="block text-small font-sans text-text mb-1">{label}</label>
                <p id={`color-${k}-hint`} className="text-caption font-sans text-text-muted mb-2">{hint}</p>
                <div className="flex gap-2">
                  <input type="color" aria-label={`${label} (selector)`} value={valid ? value : stored.colors[k]}
                    onChange={e => setColor(k, e.target.value)}
                    className="h-11 w-12 flex-shrink-0 rounded-lg border border-border-strong bg-bg p-1 cursor-pointer" />
                  <input id={`color-${k}`} type="text" inputMode="text" spellCheck={false} maxLength={7}
                    aria-describedby={`color-${k}-hint`} aria-invalid={!valid}
                    value={value} onChange={e => setColor(k, e.target.value.trim())}
                    className={`${INPUT} font-mono uppercase ${valid ? '' : 'border-danger'}`} />
                </div>
                {!valid && <p className="text-caption font-sans text-danger-text mt-1">Usa el formato #RRGGBB.</p>}
              </div>
            );
          })}
        </div>
        {lowContrastOnWhite(draft.colors.primary) && (
          <Alert tone="warning" title="El texto de la cabecera puede leerse mal">
            El color principal tiene poco contraste sobre el papel blanco. Elige un tono más oscuro para que el nombre se lea bien impreso.
          </Alert>
        )}
      </div>

      {/* Font */}
      <fieldset>
        <legend className={LABEL}>Tipografía del documento</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FONT_IDS.map((id: FontId) => {
            const f = FONT_CATALOG[id];
            const active = draft.font === id;
            return (
              <label key={id} className={`min-h-touch rounded-lg border px-3 py-2.5 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-accent ${active ? 'border-accent-border bg-accent-subtle' : 'border-border bg-bg hover:border-border-strong'}`}>
                <span className="flex items-center gap-2">
                  <input type="radio" name="branding-font" value={id} checked={active} onChange={() => update({ font: id })}
                    className="accent-accent" />
                  <span className="text-small font-sans text-text">{f.label}</span>
                  <span className="text-caption font-sans text-text-muted ml-auto">{f.group === 'serif' ? 'Con serifa' : 'Sin serifa'}</span>
                </span>
                <span className="block mt-1 text-body-sm text-text-heading truncate" style={{ fontFamily: f.css }}>{FONT_SAMPLE}</span>
              </label>
            );
          })}
        </div>
        <p className="text-caption font-sans text-text-muted mt-2">
          {font.wordNote ?? 'Esta fuente está disponible en Word en cualquier equipo.'}{' '}
          Word no incrusta fuentes web: usa la fuente instalada en el equipo y, si falta, la alternativa indicada.
        </p>
      </fieldset>

      {/* Headings toggle */}
      <label className="flex items-center justify-between gap-4 min-h-touch cursor-pointer">
        <span>
          <span className="block text-small font-sans text-text">Aplicar el color principal a los títulos</span>
          <span className="block text-caption font-sans text-text-muted">Si está desactivado, los títulos se mantienen en negro.</span>
        </span>
        <input type="checkbox" role="switch" checked={draft.applyColorsToHeadings} aria-checked={draft.applyColorsToHeadings}
          onChange={e => update({ applyColorsToHeadings: e.target.checked })}
          className="peer sr-only" />
        <span aria-hidden className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 ${draft.applyColorsToHeadings ? 'bg-accent' : 'bg-surface-muted border border-border-strong'}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface-raised shadow-sm transition-transform ${draft.applyColorsToHeadings ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </span>
      </label>

      {/* Live preview */}
      <div>
        <span className={LABEL}>Vista previa</span>
        <div className="bg-bg rounded-xl p-3 border border-border">
          <iframe title="Vista previa de un documento con tu identidad de marca" srcDoc={preview} sandbox=""
            className="w-full max-w-md mx-auto block aspect-[210/297] rounded-md bg-surface-raised border-0 shadow-sm" />
        </div>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        <Button variant="ghost" size="sm" className="min-h-touch sm:min-h-0" loading={busy === 'reset'} disabled={busy !== null && busy !== 'reset'} onClick={reset}>
          <RotateCcw size={16} aria-hidden /> Restablecer diseño Avocat
        </Button>
        <Button variant="secondary" className="min-h-touch sm:min-h-0" loading={busy === 'save'} loadingText="Guardando…"
          disabled={!dirty || !colorsValid || (busy !== null && busy !== 'save')} onClick={save}>
          Guardar identidad de marca
        </Button>
      </div>
    </section>
  );
}
