'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface CaseItem {
  id: string;
  clientName: string;
  caseTitle: string;
  caseType: string;
  deadline: string;
  status: string;
  assignedLawyer: string;
  description: string;
  daysRemaining?: number;
  daysOverdue?: number;
  priority?: 'critical' | 'urgent' | 'high';
}

const MAX_VISIBLE_ITEMS = 5;
const CARD_MIN_HEIGHT = 180;

function getPriorityTagConfig(priority?: string) {
  switch (priority) {
    case 'critical':
      return { label: 'Crítico', icon: 'warning' };
    case 'urgent':
      return { label: 'Urgente', icon: 'clock' };
    case 'high':
      return { label: 'Alto', icon: 'info' };
    default:
      return null;
  }
}

function CaseItemCard({
  c,
  variant,
  detailHref,
}: {
  c: CaseItem;
  variant: 'urgent' | 'on-time' | 'expired';
  detailHref: string;
}) {
  const tagConfig = variant === 'urgent' ? getPriorityTagConfig(c.priority) : null;
  const vencidoTag = variant === 'expired';

  return (
    <div className="p-6 hover:bg-app transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="text-sm font-semibold text-text-primary">
              {c.caseTitle}
            </span>
            {tagConfig && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-muted/40 text-text-primary border border-border">
                {tagConfig.icon === 'warning' && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
                {tagConfig.icon === 'clock' && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {tagConfig.icon === 'info' && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span>{tagConfig.label}</span>
              </span>
            )}
            {vencidoTag && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-muted/40 text-text-primary border border-border">
                Vencido
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1 text-sm text-text-secondary">
            <div><span className="font-medium">Cliente:</span> {c.clientName}</div>
            <div><span className="font-medium">Tipo:</span> {c.caseType}</div>
            <div><span className="font-medium">Abogado:</span> {c.assignedLawyer}</div>
            <div><span className="font-medium">Estado:</span> {c.status}</div>
          </div>

          <div className="mt-3 text-sm text-text-secondary">
            <span className="font-medium">Descripción:</span> {c.description}
          </div>
        </div>

        <div className="shrink-0 text-right">
          {(c.daysRemaining != null || c.daysOverdue != null) && (
            <>
              <div className="text-2xl font-bold text-text-primary">
                {c.daysRemaining != null ? c.daysRemaining : c.daysOverdue}
              </div>
              <div className="text-sm text-text-secondary">
                {c.daysRemaining != null
                  ? (c.daysRemaining === 1 ? 'día restante' : 'días restantes')
                  : (c.daysOverdue === 1 ? 'día vencido' : 'días vencidos')}
              </div>
            </>
          )}
          <div className="text-xs text-text-secondary mt-1">
            Vence: {new Date(c.deadline).toLocaleDateString()}
          </div>
          <Link
            href={detailHref}
            className="mt-3 inline-block bg-sidebar text-text-on-dark px-4 py-2 rounded-lg text-sm font-medium hover:bg-text-primary transition-colors"
          >
            Ver Detalles
          </Link>
        </div>
      </div>
    </div>
  );
}

function CaseList({
  cases,
  title,
  emptyMessage,
  variant,
  loading,
  defaultExpanded,
}: {
  cases: CaseItem[];
  title: string;
  emptyMessage: string;
  variant: 'urgent' | 'on-time' | 'expired';
  loading: boolean;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(!!defaultExpanded);
  return (
    <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-surface-muted/20 transition-colors text-left"
      >
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <span className="flex items-center gap-3">
          <span className="text-2xl font-bold text-text-primary">
            {loading ? '—' : cases.length}
          </span>
          <svg
            className={`w-5 h-5 text-text-secondary transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {expanded && (
        <div
          className="overflow-y-auto divide-y divide-border border-t border-border"
          style={{ maxHeight: CARD_MIN_HEIGHT * MAX_VISIBLE_ITEMS }}
        >
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sidebar mx-auto" />
              <p className="mt-4 text-text-secondary">Cargando...</p>
            </div>
          ) : cases.length === 0 ? (
            <div className="p-8 text-center text-text-secondary text-sm">
              {emptyMessage}
            </div>
          ) : (
            cases.map((c) => (
              <CaseItemCard
                key={c.id}
                c={c}
                variant={variant}
                detailHref="/dashboard/analisis-caso"
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CasosHubContent() {
  const searchParams = useSearchParams();
  const expandSection = searchParams?.get('expand'); // 'urgent' | 'on-time' | 'expired'
  const [urgentCases, setUrgentCases] = useState<CaseItem[]>([]);
  const [onTimeCases, setOnTimeCases] = useState<CaseItem[]>([]);
  const [expiredCases, setExpiredCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 800));
        setUrgentCases([
          {
            id: 'UC001',
            clientName: 'María González',
            caseTitle: 'Procedimiento de Protección de Datos',
            caseType: 'Derecho Administrativo',
            deadline: '2024-01-15',
            status: 'En Proceso',
            assignedLawyer: 'Dr. Carlos Mendoza',
            description: 'Caso de protección de datos personales ante la AEPD',
            daysRemaining: 2,
            priority: 'critical',
          },
          {
            id: 'UC002',
            clientName: 'Empresa ABC S.L.',
            caseTitle: 'Contrato de Prestación de Servicios',
            caseType: 'Derecho Mercantil',
            deadline: '2024-01-16',
            status: 'Revisión',
            assignedLawyer: 'Dra. Ana Rodríguez',
            description: 'Disputa contractual con proveedor de servicios',
            daysRemaining: 3,
            priority: 'urgent',
          },
          {
            id: 'UC003',
            clientName: 'Juan Pérez',
            caseTitle: 'Despido Improcedente',
            caseType: 'Derecho Laboral',
            deadline: '2024-01-17',
            status: 'Documentación',
            assignedLawyer: 'Dr. Luis Martínez',
            description: 'Reclamación por despido sin justa causa',
            daysRemaining: 4,
            priority: 'high',
          },
          {
            id: 'UC004',
            clientName: 'Familia Rodríguez',
            caseTitle: 'Sucesión Intestada',
            caseType: 'Derecho Civil',
            deadline: '2024-01-18',
            status: 'En Proceso',
            assignedLawyer: 'Dra. Carmen Silva',
            description: 'Proceso de sucesión sin testamento',
            daysRemaining: 5,
            priority: 'high',
          },
          {
            id: 'UC005',
            clientName: 'Roberto Jiménez',
            caseTitle: 'Accidente de Tráfico',
            caseType: 'Derecho Civil',
            deadline: '2024-01-19',
            status: 'Investigación',
            assignedLawyer: 'Dr. Miguel Torres',
            description: 'Reclamación por daños y perjuicios en accidente de tráfico',
            daysRemaining: 5,
            priority: 'urgent',
          },
        ]);
        setOnTimeCases([
          {
            id: 'OT001',
            clientName: 'Empresa XYZ Ltda.',
            caseTitle: 'Contrato de Arrendamiento Comercial',
            caseType: 'Derecho Comercial',
            deadline: '2024-02-15',
            status: 'En Proceso',
            assignedLawyer: 'Dra. Laura García',
            description: 'Renovación de contrato de arrendamiento comercial',
            daysRemaining: 30,
          },
          {
            id: 'OT002',
            clientName: 'María Elena Ruiz',
            caseTitle: 'Divorcio por Mutuo Acuerdo',
            caseType: 'Derecho Familiar',
            deadline: '2024-02-20',
            status: 'Documentación',
            assignedLawyer: 'Dr. Roberto Silva',
            description: 'Proceso de divorcio consensuado',
            daysRemaining: 35,
          },
          {
            id: 'OT003',
            clientName: 'Constructora ABC S.A.S.',
            caseTitle: 'Permisos de Construcción',
            caseType: 'Derecho Administrativo',
            deadline: '2024-02-25',
            status: 'Revisión',
            assignedLawyer: 'Dra. Patricia López',
            description: 'Tramitación de licencias urbanísticas',
            daysRemaining: 40,
          },
          {
            id: 'OT004',
            clientName: 'Carlos Mendoza',
            caseTitle: 'Herencia y Sucesión',
            caseType: 'Derecho Civil',
            deadline: '2024-03-01',
            status: 'En Proceso',
            assignedLawyer: 'Dr. Fernando Castro',
            description: 'Sucesión intestada con múltiples herederos',
            daysRemaining: 45,
          },
          {
            id: 'OT005',
            clientName: 'Ana Sofía Torres',
            caseTitle: 'Contrato de Prestación de Servicios',
            caseType: 'Derecho Civil',
            deadline: '2024-03-05',
            status: 'Negociación',
            assignedLawyer: 'Dra. Carmen Vega',
            description: 'Revisión y negociación de cláusulas contractuales',
            daysRemaining: 49,
          },
          {
            id: 'OT006',
            clientName: 'Grupo Empresarial Delta',
            caseTitle: 'Fusión Empresarial',
            caseType: 'Derecho Comercial',
            deadline: '2024-03-10',
            status: 'Análisis',
            assignedLawyer: 'Dr. Alejandro Ramírez',
            description: 'Due diligence y estructuración de fusión',
            daysRemaining: 54,
          },
        ]);
        setExpiredCases([
          {
            id: 'EX001',
            clientName: 'José Antonio López',
            caseTitle: 'Acción de Tutela - Derecho a la Educación',
            caseType: 'Acción de Tutela',
            deadline: '2023-12-15',
            status: 'Vencido',
            assignedLawyer: 'Dr. Carlos Mendoza',
            description: 'Tutela por negación de matrícula estudiantil',
            daysOverdue: 31,
          },
          {
            id: 'EX002',
            clientName: 'Empresa Beta S.A.S.',
            caseTitle: 'Contrato de Suministro',
            caseType: 'Derecho Comercial',
            deadline: '2023-12-20',
            status: 'Vencido',
            assignedLawyer: 'Dra. Ana Rodríguez',
            description: 'Incumplimiento contractual en suministro',
            daysOverdue: 26,
          },
          {
            id: 'EX003',
            clientName: 'María del Carmen Ruiz',
            caseTitle: 'Pensión Alimentaria',
            caseType: 'Derecho Familiar',
            deadline: '2023-12-25',
            status: 'Vencido',
            assignedLawyer: 'Dr. Luis Martínez',
            description: 'Ejecución de sentencia de alimentos',
            daysOverdue: 21,
          },
          {
            id: 'EX004',
            clientName: 'Roberto Silva',
            caseTitle: 'Accidente Laboral',
            caseType: 'Derecho Laboral',
            deadline: '2023-12-30',
            status: 'Vencido',
            assignedLawyer: 'Dra. Carmen Silva',
            description: 'Reclamación de indemnización por accidente',
            daysOverdue: 16,
          },
          {
            id: 'EX005',
            clientName: 'Familia González',
            caseTitle: 'Sucesión Intestada',
            caseType: 'Derecho Civil',
            deadline: '2024-01-05',
            status: 'Vencido',
            assignedLawyer: 'Dr. Miguel Torres',
            description: 'Proceso de sucesión sin testamento',
            daysOverdue: 10,
          },
        ]);
      } catch (error) {
        console.error('Error fetching cases:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, []);

  const totalCasos = urgentCases.length + onTimeCases.length + expiredCases.length;

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 relative">
      {/* Floating Crear Caso button - fixed so always visible when scrolling */}
      <Link
        href="/dashboard/crear-caso"
        className="fixed top-24 right-8 z-50 flex items-center gap-2 px-5 py-3 bg-sidebar text-text-on-dark rounded-full shadow-lg hover:bg-text-primary transition-colors"
        title="Crear Caso"
      >
        <span className="text-lg font-bold leading-none">+</span>
        <span className="text-sm font-semibold">Crear Caso</span>
      </Link>

      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-h1 text-text-primary mb-2">Casos</h1>
        <p className="text-body text-text-secondary mb-6">
          Gestiona tus casos, crea nuevos expedientes y analiza documentos con IA.
        </p>

        {/* Total Casos Card */}
        <div className="bg-card rounded-lg border border-border shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">
                Total de Casos
              </p>
              <p className="text-3xl font-bold text-text-primary mt-1">
                {loading ? (
                  <span className="animate-pulse">—</span>
                ) : (
                  totalCasos.toLocaleString()
                )}
              </p>
              <p className="text-sm text-text-secondary mt-1">
                En el sistema
              </p>
            </div>
            <div className="w-14 h-14 bg-surface-muted/30 rounded-lg flex items-center justify-center">
              <svg
                className="w-7 h-7 text-text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* 3 sections in order: Casos Urgentes, Casos a Tiempo, Casos Vencidos */}
        <div className="space-y-6">
          <CaseList
            cases={urgentCases}
            title="Casos Urgentes"
            emptyMessage="No hay casos urgentes"
            variant="urgent"
            loading={loading}
            defaultExpanded={expandSection === 'urgent'}
          />
          <CaseList
            cases={onTimeCases}
            title="Casos a Tiempo"
            emptyMessage="No hay casos a tiempo"
            variant="on-time"
            loading={loading}
            defaultExpanded={expandSection === 'on-time'}
          />
          <CaseList
            cases={expiredCases}
            title="Casos Vencidos"
            emptyMessage="No hay casos vencidos"
            variant="expired"
            loading={loading}
            defaultExpanded={expandSection === 'expired'}
          />
        </div>
      </div>
    </div>
  );
}

export default function CasosHubPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sidebar" />
        </div>
      </div>
    }>
      <CasosHubContent />
    </Suspense>
  );
}
