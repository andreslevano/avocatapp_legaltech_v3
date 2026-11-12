'use client';

import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { getCheckoutSessionEndpoint } from '@/lib/api-endpoints';
import { useState, type DragEvent } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ToolLayout } from '@/lib/auth';
import { TOOL_GROUPS as GROUPS, moveTool, resolveLayout, type ToolGroupId as GroupId } from '@/lib/tool-layout';
import { IconButton } from '@/components/ui/IconButton';
import { orgNdaTemplateFor } from '@/lib/org-templates';
import { Banknote, ChartColumn, FileLock2, FilePenLine, GraduationCap, Handshake, Mail, Scale, Search, Star, type LucideIcon } from 'lucide-react';

interface Tool {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Default group: "Favoritos" until the user moves it (drag and drop or star). Set it to highlight a tool. */
  featured?: boolean;
}

const TOOLS_COMMON: Tool[] = [
  {
    href: '/tools/nda',
    title: 'Generador de NDA',
    description: 'Crea un Acuerdo de Confidencialidad completo y listo para firma. Consulta NDAs previos en tu repositorio como referencia.',
    icon: FileLock2,
    featured: true,
  },
  {
    href: '/tools/analisis',
    title: 'Análisis de Documentos',
    description: 'Sube un documento y GPT-4o extrae resumen, riesgos, cláusulas clave y recomendaciones.',
    icon: Search,
  },
  {
    href: '/tools/generacion',
    title: 'Generación de Escritos',
    description: 'Genera documentos legales profesionales (demandas, recursos, contratos) con IA.',
    icon: FilePenLine,
  },
  {
    href: '/tools/extraccion-datos',
    title: 'Extracción de Datos',
    description: 'Extrae campos estructurados de facturas, contratos y otros documentos automáticamente.',
    icon: ChartColumn,
  },
  {
    href: '/tools/revision-email',
    title: 'Revisión de Email',
    description: 'Analiza el contenido de emails legales: categorías, ideas principales, nivel de riesgo.',
    icon: Mail,
  },
];

// Organisation templates (MOBIFORWORK): only for users of that organisation.
const TOOLS_MOBILITYFORWORK: Tool[] = [
  {
    href: '/tools/contrato-servicios',
    title: 'Generador de contrato de servicios',
    description: 'Contrato de Prestación de Servicios con la plantilla de MOBIFORWORK: datos del colaborador, tarifa y firma con DocuSign.',
    icon: Handshake,
    featured: true,
  },
];

const TOOLS_AUTOSERVICIO: Tool[] = [
  {
    href: '/escritos/accion-tutela',
    title: 'Acción de Tutela',
    description: 'Redacta una acción de tutela paso a paso con IA. Incluye historial de documentos generados.',
    icon: Scale,
  },
  {
    href: '/escritos/reclamacion-cantidad',
    title: 'Reclamación de Cantidades',
    description: 'Genera cartas de reclamación económica con los datos de tu caso.',
    icon: Banknote,
  },
];

const TOOLS_ESTUDIANTES: Tool[] = [
  {
    href: '/tools/estudiantes',
    title: 'Documentos por Área Legal',
    description: 'Más de 44 modelos de escritos académicos de las 8 áreas del derecho español. €3 por documento.',
    icon: GraduationCap,
  },
];

const CREDITOS_TOPUP_EUR10 = 10;

export default function ToolsPage() {
  const { user, userDoc } = useAppAuth();
  const isAutoservicio = userDoc.plan === 'Autoservicio';
  const isEstudiantes = userDoc.plan === 'Estudiantes';
  const [topping, setTopping] = useState(false);

  const tools: Tool[] = [
    ...(isEstudiantes ? TOOLS_ESTUDIANTES : []),
    ...(isAutoservicio ? TOOLS_AUTOSERVICIO : []),
    ...TOOLS_COMMON.slice(0, 1),
    ...(orgNdaTemplateFor(user) === 'mobilityforwork' ? TOOLS_MOBILITYFORWORK : []),
    ...TOOLS_COMMON.slice(1),
  ];
  const byHref = new Map(tools.map(t => [t.href, t]));

  // Local edits win over the snapshot in userDoc (which is not refreshed after our write).
  const [edited, setEdited] = useState<ToolLayout | null>(null);
  const layout = resolveLayout(tools, edited ?? userDoc.toolLayout);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ group: GroupId; before?: string } | null>(null);

  function applyMove(href: string, to: GroupId, before?: string) {
    const next = moveTool(layout, href, to, before);
    setEdited(next);
    if (db && userDoc.uid) {
      updateDoc(doc(db, 'users', userDoc.uid), { toolLayout: next, updatedAt: serverTimestamp() })
        .catch(err => console.error('[tools] could not save layout', err));
    }
  }

  function onDragStart(e: DragEvent, href: string) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', href);
    setDragging(href);
  }
  function onDragOver(e: DragEvent, group: GroupId, before?: string) {
    if (!dragging) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dropTarget?.group !== group || dropTarget?.before !== before) setDropTarget({ group, before });
  }
  function onDrop(e: DragEvent, group: GroupId, before?: string) {
    e.preventDefault();
    e.stopPropagation();
    const href = dragging ?? e.dataTransfer.getData('text/plain');
    if (href && href !== before && byHref.has(href)) applyMove(href, group, before);
    setDragging(null);
    setDropTarget(null);
  }
  function onDragEnd() {
    setDragging(null);
    setDropTarget(null);
  }

  const creditos = userDoc.creditos_disponibles ?? 0;

  async function handleTopup() {
    if (!user) return;
    setTopping(true);
    try {
      const endpoint = getCheckoutSessionEndpoint();
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ name: `Top-up ${CREDITOS_TOPUP_EUR10} créditos Autoservicio`, price: 1000, quantity: 1 }],
          documentType: 'credito_topup',
          userId: user.uid,
          uid: user.uid,
          customerEmail: user.email ?? '',
          successUrl: `${window.location.origin}/tools?topup=success`,
          cancelUrl: `${window.location.origin}/tools`,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setTopping(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <AppHeader title="Herramientas" subtitle="Funciones especializadas con IA" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">

        {/* Credit balance banner for Autoservicio */}
        {isAutoservicio && (
          <div className="flex items-center justify-between bg-surface border border-border rounded-xl px-5 py-3 max-w-3xl">
            <div>
              <p className="text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-0.5">
                Créditos disponibles
              </p>
              <p className={`text-h3 font-display font-semibold ${creditos <= 5 ? 'text-warning-text' : 'text-text-heading'}`}>
                {creditos}
                <span className="text-small font-sans text-text-muted ml-1">/ mes</span>
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={topping}
              onClick={handleTopup}
            >
              + 10 créditos · €10
            </Button>
          </div>
        )}

        {GROUPS.map(g => {
          const items = layout[g.id].map(h => byHref.get(h)!).filter(Boolean);
          const isTarget = dropTarget?.group === g.id;
          return (
            <section
              key={g.id}
              aria-labelledby={`tools-${g.id}`}
              className="max-w-3xl"
              onDragOver={e => onDragOver(e, g.id)}
              onDrop={e => onDrop(e, g.id)}
            >
              <h2 id={`tools-${g.id}`} className="text-label font-sans font-semibold uppercase tracking-widest text-text-muted mb-3">
                {g.title}
              </h2>
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl transition-colors ${
                  dragging ? 'p-2 -m-2 border border-dashed ' + (isTarget ? 'border-accent-border bg-accent-subtle' : 'border-border') : ''
                }`}
              >
                {items.map(t => {
                  const fav = g.id === 'favoritos';
                  return (
                    <div
                      key={t.href}
                      draggable
                      onDragStart={e => onDragStart(e, t.href)}
                      onDragEnd={onDragEnd}
                      onDragOver={e => onDragOver(e, g.id, t.href)}
                      onDrop={e => onDrop(e, g.id, t.href)}
                      className={`relative bg-surface border rounded-xl transition-colors group cursor-grab active:cursor-grabbing hover:border-accent-border hover:bg-surface-muted ${
                        dragging === t.href ? 'opacity-50' : ''
                      } ${dropTarget?.before === t.href && dragging !== t.href ? 'border-accent' : 'border-border'}`}
                    >
                      <Link href={t.href} draggable={false} className="block p-5 pr-14 rounded-xl">
                        <t.icon size={24} className="mb-3 text-accent-text" aria-hidden />
                        <h3 className="font-sans font-semibold text-body-sm text-text group-hover:text-text-heading mb-1.5">
                          {t.title}
                        </h3>
                        <p className="text-caption text-text-muted leading-relaxed">{t.description}</p>
                      </Link>
                      <IconButton
                        icon={Star}
                        size="sm"
                        label={fav ? `Quitar ${t.title} de favoritos` : `Añadir ${t.title} a favoritos`}
                        pressed={fav}
                        onClick={() => applyMove(t.href, fav ? 'principales' : 'favoritos')}
                        className={`absolute top-3 right-3 ${fav ? '[&>svg]:text-accent-text [&>svg]:fill-current' : '[&>svg]:text-text-muted'}`}
                      />
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <p className="sm:col-span-2 rounded-xl border border-dashed border-border px-5 py-6 text-caption text-text-muted text-center">
                    {g.id === 'favoritos'
                      ? 'Arrastra aquí una herramienta o pulsa la estrella para añadirla a favoritos.'
                      : 'Arrastra aquí una herramienta para quitarla de favoritos.'}
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
