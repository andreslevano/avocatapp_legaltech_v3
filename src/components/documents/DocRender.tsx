'use client';

// Renders a document's content (PDF, Avocat .doc, .docx, image, text) for the preview panel and the
// full-screen viewer. Kinds and limits: src/lib/documents/viewer.ts. HTML is shown only inside a
// sandboxed iframe (sandbox="" → no scripts, no same-origin), like the NDA preview.

import { useEffect, useState } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { FileTypeIcon } from '@/components/ui/FileTypeIcon';
import { isHtmlDoc, viewerKind, wrapFragment, type ViewerDoc } from '@/lib/documents/viewer';

type Loaded = { state: 'loading' } | { state: 'html'; html: string } | { state: 'text'; text: string } | { state: 'fail'; reason: string };

/** Cache per URL: moving back and forth in the viewer doesn't refetch/reconvert. */
const cache = new Map<string, Promise<Loaded>>();

async function load(kind: 'doc' | 'docx' | 'text', url: string, title: string): Promise<Loaded> {
  const res = await fetch(url);
  if (!res.ok) return { state: 'fail', reason: 'No se pudo descargar el documento.' };
  if (kind === 'text') return { state: 'text', text: await res.text() };
  if (kind === 'doc') {
    const text = await res.text();
    return isHtmlDoc(text)
      ? { state: 'html', html: text.replace(/^﻿/, '') }
      : { state: 'fail', reason: 'Este Word antiguo (.doc) no se puede previsualizar.' };
  }
  const mod = await import('mammoth');
  const mammoth = (mod as unknown as { default?: typeof mod }).default ?? mod;
  const { value } = await mammoth.convertToHtml({ arrayBuffer: await res.arrayBuffer() });
  return { state: 'html', html: wrapFragment(value, title) };
}

interface Props {
  doc: ViewerDoc;
  /** Small render for the side panel (document scaled down). */
  compact?: boolean;
}

export default function DocRender({ doc, compact = false }: Props) {
  const { kind, url, ext } = viewerKind(doc);
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' });

  useEffect(() => {
    if (kind !== 'doc' && kind !== 'docx' && kind !== 'text') return;
    let alive = true;
    setLoaded({ state: 'loading' });
    const key = `${kind}:${url}`;
    if (!cache.has(key)) {
      cache.set(key, load(kind, url, doc.name).catch(() => {
        cache.delete(key);
        return { state: 'fail', reason: 'No se pudo abrir el documento.' } as Loaded;
      }));
    }
    cache.get(key)!.then(r => { if (alive) setLoaded(r); });
    return () => { alive = false; };
  }, [kind, url, doc.name]);

  if (kind === 'pdf') {
    return <iframe src={url} title={doc.name} className="w-full h-full border-0 bg-surface-raised" />;
  }
  if (kind === 'image') {
    return (
      <div className="flex items-center justify-center h-full p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={doc.name} className="max-w-full max-h-full object-contain rounded-lg" />
      </div>
    );
  }
  if (kind === 'none' || kind === 'too-big' || loaded.state === 'fail') {
    const reason = kind === 'too-big' ? 'El archivo es demasiado grande para previsualizarlo.'
      : loaded.state === 'fail' ? loaded.reason
      : `Los archivos ${ext.toUpperCase() || 'de este tipo'} no tienen vista previa.`;
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
        <FileTypeIcon name={`f.${ext}`} size={48} className="text-text-muted" />
        <p className="text-caption text-text-muted">{reason}</p>
        {!compact && (
          <div className="flex flex-wrap justify-center gap-2">
            <a href={url} download target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 min-h-touch sm:min-h-0 px-3 py-1.5 rounded-lg border border-border-strong text-small text-text hover:bg-surface-muted">
              <Download size={16} aria-hidden /> Descargar
            </a>
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 min-h-touch sm:min-h-0 px-3 py-1.5 rounded-lg text-small text-accent-text hover:underline">
              <ExternalLink size={16} aria-hidden /> Abrir en una pestaña
            </a>
          </div>
        )}
      </div>
    );
  }
  if (loaded.state === 'loading') {
    return (
      <div className="flex items-center justify-center h-full" role="status" aria-label="Cargando documento">
        <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }
  if (loaded.state === 'text') {
    return <pre className="h-full overflow-auto p-4 text-caption font-mono text-text whitespace-pre-wrap">{loaded.text}</pre>;
  }
  // HTML document: white paper, scaled down in the side panel.
  const srcDoc = compact
    ? loaded.html.replace('</head>', '<style>html{zoom:.45}body{margin:0;padding:1.2cm 1.4cm}</style></head>')
    : loaded.html.replace('</head>', '<style>body{margin:0 auto;padding:1.5cm 1.8cm;max-width:21cm}@media (max-width:600px){body{padding:20px 16px}}</style></head>');
  return <iframe title={doc.name} srcDoc={srcDoc} sandbox="" className="w-full h-full border-0 bg-surface-raised" />;
}
