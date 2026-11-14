// Server-side document branding (Admin SDK): signatures/server.ts (DocuSign) and src/lib/pdf/*.
// Server-only. Resolution rules live in src/lib/branding.ts.

import { db, storage } from '@/lib/firebase-admin';
import {
  isSafeLogoSrc, resolveBranding, sanitizeBranding, withLogoSrc, withSafeFont,
  type BrandingOwner, type OrgTemplateContext, type ResolvedBranding,
} from '@/lib/branding';

const bucketName = () => process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'avocat-legaltech-v3.firebasestorage.app';
const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };

export interface ServerBranding {
  branding: ResolvedBranding;
  /** Raw logo bytes for pdfkit / docx (null without a logo or when it couldn't be read). */
  logo: { bytes: Buffer; mime: string } | null;
}

/** The owner's logo bytes from Storage (path validated by rules: users/{uid}/branding/logo.<ext>). */
async function readLogo(uid: string, path: string | null): Promise<ServerBranding['logo']> {
  const m = path?.match(new RegExp(`^users/${uid}/branding/logo\\.(png|jpg|webp)$`));
  if (!m) return null;
  try {
    const [bytes] = await storage().bucket(bucketName()).file(path!).download();
    return bytes.length <= 1024 * 1024 ? { bytes, mime: MIME[m[1]] } : null;
  } catch (e) {
    console.warn('[branding] logo not readable', path, (e as Error).message);
    return null;
  }
}

/**
 * Branding of `uid`'s documents with the logo embedded as a data URI (DocuSign converts the HTML on
 * its servers, so nothing may depend on fetching our URLs). `forSignature` keeps only the web-safe
 * part of the font stack: DocuSign's HTML conversion does not load web fonts (see branding report).
 */
export async function loadOwnerBranding(
  uid: string, opts: { forSignature?: boolean; org?: OrgTemplateContext | null } = {},
): Promise<ServerBranding> {
  const owner = ((await db().collection('users').doc(uid).get()).data() ?? {}) as BrandingOwner;
  let branding = resolveBranding(owner, opts.org);
  let logo: ServerBranding['logo'] = null;
  if (branding.logo) {
    logo = await readLogo(uid, sanitizeBranding(owner.branding).logoPath);
    branding = logo
      ? withLogoSrc(branding, `data:${logo.mime};base64,${logo.bytes.toString('base64')}`)
      : { ...branding, logo: null };
  }
  if (opts.forSignature) branding = withSafeFont(branding);
  return { branding, logo };
}

/**
 * A saved branded .doc references the logo by its Storage download URL (that is what Word needs).
 * Before sending it to DocuSign, inline that image so the conversion doesn't depend on fetching it.
 */
export async function inlineSavedLogo(html: string): Promise<string> {
  const m = html.match(/<img class="doc-logo" src="([^"]+)"/);
  if (!m) return html;
  const url = m[1].replace(/&amp;/g, '&');
  if (url.startsWith('data:') || !isSafeLogoSrc(url)) return html;
  try {
    const res = await fetch(url);
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !/^image\/(png|jpeg|webp)$/.test(type)) throw new Error(`${res.status} ${type}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 1024 * 1024) throw new Error('too big');
    return html.replace(m[0], `<img class="doc-logo" src="data:${type};base64,${buf.toString('base64')}"`);
  } catch (e) {
    console.warn('[branding] saved logo not inlined', (e as Error).message);
    return html;
  }
}
