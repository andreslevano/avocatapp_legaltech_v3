export const PILOT_USER_EMAILS: string[] = [
  'asesoria@asesoriapozuelo.com',
  'geovany.manzap@mobilityforwork.es',
];

export function isPilotUser(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return PILOT_USER_EMAILS.includes(normalized);
}

