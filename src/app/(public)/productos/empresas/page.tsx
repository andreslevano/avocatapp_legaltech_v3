import type { Metadata } from 'next';
import { Building2, FileSignature, FolderTree, Handshake, LayoutTemplate, Scale, Users, Coins } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import StatusChip from '@/components/pricing/StatusChip';
import { formatNumber, formatPrice, planById, planTaxLine, PRICES, type FeatureStatus } from '@/lib/pricing';

export const metadata: Metadata = {
  title: 'Avocat para empresas y despachos',
  description: 'Para despachos y empresas con área legal: todo el plan Abogado, créditos compartidos y externos que revisan y firman sin coste.',
};

// Feature truth (Precios v4, D11): roadmap items carry their status chip.
const FEATURES: { title: string; description: string; icon: typeof Scale; status: FeatureStatus }[] = [
  { title: 'Todo el plan Abogado', description: 'Agente IA con el contexto de cada caso, casos, clientes, plazos, panel y documentos en Word y PDF.', icon: Scale, status: 'live' },
  { title: 'Créditos compartidos', description: 'Un saldo común para el equipo: 2.000 créditos al mes en Inicial y 8.000 en Negocio.', icon: Coins, status: 'live' },
  { title: 'Plantillas de tu organización', description: 'Tus contratos y NDA validados por tu abogado, con tu cabecera, listos para generar.', icon: LayoutTemplate, status: 'pilot' },
  { title: 'Repositorio con carpetas', description: 'Todos los documentos del equipo organizados, con importación desde OneDrive y SharePoint (piloto).', icon: FolderTree, status: 'live' },
  { title: 'Externos sin coste', description: 'Socios, clientes y proveedores revisan y firman sin cuenta: 25 en Inicial, 250 en Negocio, ilimitados a medida.', icon: Handshake, status: 'soon' },
  { title: 'Firma electrónica incluida', description: 'Envíos a firma compartidos cada mes (20 en Inicial, 60 en Negocio), sin cuentas de terceros.', icon: FileSignature, status: 'signature' },
  { title: 'Roles y dos espacios', description: 'Administrador, miembro y externo; el espacio del despacho y el de la empresa, con permisos propios.', icon: Users, status: 'soon' },
  { title: 'Despacho o empresa con área legal', description: 'Pensado para despachos con varios abogados y para departamentos legales dentro de una empresa.', icon: Building2, status: 'live' },
];

const STEPS = [
  { step: '1', title: 'Elige el plan', description: 'Según las personas que trabajarán en Avocat: hasta 3, hasta 10 o más de 25.' },
  { step: '2', title: 'Invita a tu equipo', description: 'Compartid créditos, documentos y envíos a firma.' },
  { step: '3', title: 'Trabaja con tus externos', description: 'Clientes y proveedores revisan y firman sin cuenta y sin coste.' },
];

export default function EmpresasPage() {
  const ini = planById('empresa-inicial');
  const neg = planById('empresa-negocio');
  const plans = [ini, neg];
  return (
    <div className="min-h-screen">
      <section
        data-theme="dark"
        className="relative min-h-[520px] flex items-center py-24 overflow-hidden"
        style={{ backgroundImage: 'url(/images/hero-abogados-background.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-bg/80" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <Tag variant="gold" className="mb-6">{`Planes Empresa — desde ${formatPrice('ES', PRICES.ES['empresa-inicial'].monthly)}/mes · ${planTaxLine('empresa-inicial', 'ES')}`}</Tag>
          <h1 className="font-display text-h1 text-text mb-6 max-w-3xl mx-auto">Avocat para despachos y empresas</h1>
          <p className="font-sans text-body text-text-muted max-w-2xl mx-auto mb-10">
            Tu equipo trabaja en Avocat con créditos compartidos; tus externos revisan y firman sin coste.
            Para despachos con varios abogados y empresas con un área legal propia.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button href="/contacto?motivo=empresa&plan=empresa-inicial" variant="accent" size="lg">Solicitar demostración</Button>
            <Button href="/precios?perfil=empresa#empresa" variant="secondary" size="lg">Ver precios</Button>
          </div>
        </div>
      </section>

      <section className="py-20 bg-bg">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-h2 text-text mb-3">Pensado para trabajar en equipo</h2>
            <p className="font-sans text-body text-text-muted max-w-xl mx-auto">Lo que ya puedes usar y lo que llega pronto, con su estado.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ title, description, icon: Icon, status }) => (
              <div key={title} className="bg-surface rounded-xl p-6 border border-border shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-accent-subtle border border-accent-border flex items-center justify-center text-accent-text mb-4">
                  <Icon size={20} aria-hidden />
                </div>
                <h3 className="font-sans font-semibold text-body text-text mb-2">{title}</h3>
                <p className="font-sans text-small text-text-muted leading-relaxed mb-3">{description}</p>
                <StatusChip status={status} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-surface">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-display text-h2 text-text text-center mb-10">Planes Empresa</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {plans.map(p => (
              <div key={p.id} className="rounded-xl border border-border bg-bg p-6">
                <h3 className="font-sans font-semibold text-h4 text-text-heading">{p.name}</h3>
                <p className="mt-2 font-display text-h2 text-text-heading">{formatPrice('ES', PRICES.ES[p.id].monthly)}<span className="font-sans text-small text-text-muted">/mes</span></p>
                <p className="text-caption text-text-muted">{planTaxLine(p.id, 'ES')}</p>
                <p className="mt-3 text-small text-text">{p.usersLabel} · {formatNumber('ES', p.creditsPerMonth!)} créditos compartidos</p>
              </div>
            ))}
            <div className="rounded-xl border border-border bg-bg p-6">
              <h3 className="font-sans font-semibold text-h4 text-text-heading">Empresa a Medida</h3>
              <p className="mt-2 font-display text-h2 text-text-heading">Desde {formatPrice('ES', PRICES.ES['empresa-medida'].monthly)}<span className="font-sans text-small text-text-muted">/mes</span></p>
              <p className="text-caption text-text-muted">{planTaxLine('empresa-medida', 'ES')}</p>
              <p className="mt-3 text-small text-text">25 usuarios o más · condiciones por contrato</p>
            </div>
          </div>
          <p className="mt-6 text-center text-small text-text-muted">Precios para España. <a href="/precios?perfil=empresa#comparar" className="text-accent-text underline">Compara todos los planes y países</a>.</p>
        </div>
      </section>

      <section className="py-20 bg-bg">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-display text-h2 text-text text-center mb-10">Cómo funciona</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map(s => (
              <div key={s.step} className="text-center">
                <div data-theme="dark" className="w-12 h-12 rounded-full bg-bg text-accent-text font-display text-h3 font-semibold flex items-center justify-center mx-auto mb-4">{s.step}</div>
                <h3 className="font-sans font-semibold text-body-sm text-text mb-1">{s.title}</h3>
                <p className="font-sans text-small text-text-muted">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section data-theme="dark" className="py-20 bg-bg">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-h2 text-text mb-4">¿Hablamos de tu equipo?</h2>
          <p className="font-sans text-body text-text-muted mb-8">Te enseñamos Avocat con tus documentos y te proponemos el plan que encaja.</p>
          <Button href="/contacto?motivo=empresa" variant="accent" size="lg">Solicitar demostración</Button>
        </div>
      </section>
    </div>
  );
}
