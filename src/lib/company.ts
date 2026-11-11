// Operator identification (LSSI-CE art. 10) shown in the footer and /aviso-legal.
// TODO(ds-v4): replace every bracketed placeholder with the operator's real registry data.
export const COMPANY = {
  brand: 'Avocat',
  legalName: '[RAZÓN SOCIAL]',
  nif: '[NIF]',
  address: '[DOMICILIO]',
  registry: '[REGISTRO MERCANTIL]',
  email: 'soporte@avocatapp.com',
  web: 'https://avocatapp.com',
} as const;

export const NOT_A_LAW_FIRM = 'Avocat no es un despacho de abogados y no presta asesoramiento jurídico.';

/** One set of social links for every public page. */
export const SOCIAL_LINKS = [
  { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/company/avocatapp' },
  { id: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/avocatapp' },
] as const;

export function legalLine(year = new Date().getFullYear()): string {
  return `© ${year} ${COMPANY.legalName} · NIF ${COMPANY.nif} · ${COMPANY.address} · ${COMPANY.registry} · ${COMPANY.email} · ${NOT_A_LAW_FIRM}`;
}
