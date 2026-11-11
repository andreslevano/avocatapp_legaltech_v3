import type { Metadata } from 'next';
import Link from 'next/link';
import { COMPANY, NOT_A_LAW_FIRM } from '@/lib/company';

export const metadata: Metadata = {
  title: 'Aviso legal — Avocat',
  description: 'Identificación del titular de Avocat (LSSI-CE, art. 10).',
};

// TODO(ds-v4): legal text to be validated by counsel; company data comes from src/lib/company.ts.
export default function AvisoLegalPage() {
  const rows: [string, string][] = [
    ['Titular', COMPANY.legalName],
    ['NIF', COMPANY.nif],
    ['Domicilio', COMPANY.address],
    ['Datos registrales', COMPANY.registry],
    ['Correo electrónico', COMPANY.email],
    ['Sitio web', COMPANY.web],
  ];
  return (
    <div className="bg-bg">
      <div className="max-w-prose mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-h1 mb-6">Aviso legal</h1>
        <p className="text-body text-text mb-8">
          En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información
          y de Comercio Electrónico (LSSI-CE), se informa de los datos identificativos del titular de este sitio web.
        </p>

        <dl className="divide-y divide-border border-y border-border mb-10">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-3">
              <dt className="text-body-sm font-medium text-text-muted">{k}</dt>
              <dd className="sm:col-span-2 text-body-sm text-text">{v}</dd>
            </div>
          ))}
        </dl>

        <h2 className="text-h2 mb-3">Objeto</h2>
        <p className="text-body text-text mb-6">
          Avocat es una plataforma tecnológica que ayuda a preparar y organizar documentación jurídica con inteligencia
          artificial. {NOT_A_LAW_FIRM} Los borradores que genera deben ser revisados por la persona usuaria o por un
          abogado colegiado antes de usarse.
        </p>

        <h2 className="text-h2 mb-3">Condiciones de uso y privacidad</h2>
        <p className="text-body text-text">
          El uso del servicio se rige por los <Link href="/terminos" className="text-accent-text underline">Términos</Link>,
          la <Link href="/privacidad" className="text-accent-text underline">Política de privacidad</Link> y la{' '}
          <Link href="/cookies" className="text-accent-text underline">Política de cookies</Link>.
        </p>
      </div>
    </div>
  );
}
