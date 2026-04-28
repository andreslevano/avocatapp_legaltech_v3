'use client';

import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import { useAppAuth } from '@/contexts/AppAuthContext';

const TOOLS_COMMON = [
  {
    href: '/tools/analisis',
    title: 'Análisis de Documentos',
    description: 'Sube un documento y GPT-4o extrae resumen, riesgos, cláusulas clave y recomendaciones.',
    icon: '🔍',
  },
  {
    href: '/tools/generacion',
    title: 'Generación de Escritos',
    description: 'Genera documentos legales profesionales (demandas, recursos, contratos) con IA.',
    icon: '✍️',
  },
  {
    href: '/tools/extraccion-datos',
    title: 'Extracción de Datos',
    description: 'Extrae campos estructurados de facturas, contratos y otros documentos automáticamente.',
    icon: '📊',
  },
  {
    href: '/tools/revision-email',
    title: 'Revisión de Email',
    description: 'Analiza el contenido de emails legales: categorías, ideas principales, nivel de riesgo.',
    icon: '📧',
  },
];

const TOOLS_AUTOSERVICIO = [
  {
    href: '/dashboard/autoservicio/accion-tutela',
    title: 'Acción de Tutela',
    description: 'Redacta una acción de tutela paso a paso con IA. Incluye historial de documentos generados.',
    icon: '⚖️',
  },
  {
    href: '/dashboard/autoservicio/reclamacion-cantidades',
    title: 'Reclamación de Cantidades',
    description: 'Genera cartas de reclamación económica con los datos de tu caso.',
    icon: '💶',
  },
];

export default function ToolsPage() {
  const { userDoc } = useAppAuth();
  const isAutoservicio = userDoc.plan === 'Autoservicio';

  const tools = isAutoservicio
    ? [...TOOLS_AUTOSERVICIO, ...TOOLS_COMMON]
    : TOOLS_COMMON;

  return (
    <div className="flex flex-col h-full">
      <AppHeader title="Herramientas" subtitle="Funciones especializadas con IA" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
          {tools.map(t => (
            <Link
              key={t.href}
              href={t.href}
              className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5 hover:border-avocat-gold/30 hover:bg-[#252218] transition-colors group"
            >
              <div className="text-3xl mb-3">{t.icon}</div>
              <h3 className="font-sans font-semibold text-[14px] text-[#c8c0ac] group-hover:text-[#e8d4a0] mb-1.5">
                {t.title}
              </h3>
              <p className="text-[12px] text-[#6b6050] leading-relaxed">{t.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
