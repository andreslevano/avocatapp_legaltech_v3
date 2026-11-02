// Official feeds (F2 step 1). Parsing is pure and unit tested; fetching is a thin layer on top.
//   BOE   — open-data API: daily summary JSON (section I, "Disposiciones generales") + item XML text.
//   EU    — Publications Office CELLAR: SPARQL for new regulations / directives (Spanish titles) +
//           XHTML text by CELEX (eur-lex.europa.eu itself serves a bot challenge to servers).

export interface FeedItem {
  source: 'boe' | 'eurlex';
  externalId: string;
  title: string;
  url: string;          // human page
  textUrl: string;      // machine-readable full text
  publishedAt: string;  // YYYY-MM-DD
  jurisdiction: 'ES' | 'EU';
  department?: string;
}

const ymd = (d: string) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
const asArray = <T>(x: T | T[] | undefined | null): T[] => (x == null ? [] : Array.isArray(x) ? x : [x]);

/** BOE daily summary → section I items. The API nests departments / epígrafes / items as object-or-array. */
export function parseBoeSummary(json: unknown): FeedItem[] {
  const sumario = (json as { data?: { sumario?: { metadatos?: { fecha_publicacion?: string }; diario?: unknown } } })?.data?.sumario;
  const date = sumario?.metadatos?.fecha_publicacion;
  if (!sumario || !date) return [];
  const out: FeedItem[] = [];
  type Item = { identificador?: string; titulo?: string; url_html?: string; url_xml?: string };
  const collect = (node: unknown, department: string | undefined) => {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    for (const it of asArray(n.item as Item | Item[])) {
      if (it?.identificador?.startsWith('BOE-A-') && it.titulo) {
        out.push({
          source: 'boe', externalId: it.identificador, title: it.titulo.trim(),
          url: it.url_html || `https://www.boe.es/diario_boe/txt.php?id=${it.identificador}`,
          textUrl: it.url_xml || `https://www.boe.es/diario_boe/xml.php?id=${it.identificador}`,
          publishedAt: ymd(date), jurisdiction: 'ES', department,
        });
      }
    }
    for (const ep of asArray(n.epigrafe as unknown[])) collect(ep, department);
    if (n.texto) collect(n.texto, department);
  };
  for (const diario of asArray(sumario.diario as Record<string, unknown>[])) {
    for (const sec of asArray(diario?.seccion as Record<string, unknown>[])) {
      if (sec?.codigo !== '1') continue;                       // I. Disposiciones generales
      for (const dep of asArray(sec.departamento as Record<string, unknown>[])) collect(dep, dep?.nombre as string | undefined);
    }
  }
  return out;
}

/** BOE item XML → plain text of the provision + entry-into-force date when stated in the metadata. */
export function parseBoeItemXml(xml: string): { text: string; effectiveFrom: string | null; rank: string | null } {
  const vig = /<fecha_vigencia>(\d{8})<\/fecha_vigencia>/.exec(xml)?.[1];
  const rank = /<rango[^>]*>([^<]+)<\/rango>/.exec(xml)?.[1]?.trim() ?? null;
  const body = /<texto[^>]*>([\s\S]*?)<\/texto>/.exec(xml)?.[1] ?? '';
  return { text: htmlToText(body), effectiveFrom: vig ? ymd(vig) : null, rank };
}

export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/h\d|\/li|\/tr)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n\s*\n+/g, '\n\n').trim();
}

/** SPARQL for EU regulations and directives (not implementing acts or corrigenda) dated in [from, to]. */
export function eurLexQuery(from: string, to: string): string {
  return `PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
SELECT DISTINCT ?celex ?date ?title WHERE {
  ?work cdm:resource_legal_id_celex ?celex ;
        cdm:work_date_document ?date ;
        cdm:work_has_resource-type ?type .
  FILTER(?type IN (<http://publications.europa.eu/resource/authority/resource-type/REG>, <http://publications.europa.eu/resource/authority/resource-type/DIR>))
  FILTER(?date >= "${from}"^^xsd:date && ?date <= "${to}"^^xsd:date)
  ?expr cdm:expression_belongs_to_work ?work ;
        cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/SPA> ;
        cdm:expression_title ?title .
} ORDER BY DESC(?date) LIMIT 200`;
}

export function parseEurLexResults(json: unknown): FeedItem[] {
  const rows = (json as { results?: { bindings?: Record<string, { value: string }>[] } })?.results?.bindings ?? [];
  const seen = new Set<string>();
  return rows.flatMap(r => {
    const celex = r.celex?.value ?? '';
    // Corrigenda ("…R(05)") and anything that isn't a plain act number are noise for NDAs.
    if (!/^3\d{4}[LR]\d{4}$/.test(celex) || seen.has(celex)) return [];
    seen.add(celex);
    return [{
      source: 'eurlex' as const, externalId: celex, title: (r.title?.value ?? '').trim(),
      url: `https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:${celex}`,
      textUrl: `http://publications.europa.eu/resource/celex/${celex}`,
      publishedAt: (r.date?.value ?? '').slice(0, 10), jurisdiction: 'EU' as const,
    }];
  });
}

// ── Fetching ─────────────────────────────────────────────────────

const UA = { 'User-Agent': 'Avocat legal-monitor (+https://avocatapp.com)' };

/** BOE summary for one day ('YYYY-MM-DD'); [] when there is no issue (Sundays, holidays). */
export async function fetchBoeDay(date: string): Promise<FeedItem[]> {
  const res = await fetch(`https://www.boe.es/datosabiertos/api/boe/sumario/${date.replace(/-/g, '')}`, { headers: { ...UA, Accept: 'application/json' } });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`BOE ${date}: HTTP ${res.status}`);
  return parseBoeSummary(await res.json());
}

export async function fetchEurLex(from: string, to: string): Promise<FeedItem[]> {
  const url = `https://publications.europa.eu/webapi/rdf/sparql?query=${encodeURIComponent(eurLexQuery(from, to))}`;
  const res = await fetch(url, { headers: { ...UA, Accept: 'application/sparql-results+json' } });
  if (!res.ok) throw new Error(`EUR-Lex SPARQL: HTTP ${res.status}`);
  return parseEurLexResults(await res.json());
}

/** Full text (trimmed for the model) + entry-into-force date when the source states it. */
export async function fetchItemText(item: Pick<FeedItem, 'source' | 'textUrl'>, maxChars = 30_000): Promise<{ text: string; effectiveFrom: string | null }> {
  if (item.source === 'boe') {
    const res = await fetch(item.textUrl, { headers: UA });
    if (!res.ok) throw new Error(`BOE text: HTTP ${res.status}`);
    const p = parseBoeItemXml(await res.text());
    return { text: p.text.slice(0, maxChars), effectiveFrom: p.effectiveFrom };
  }
  const res = await fetch(item.textUrl, { headers: { ...UA, Accept: 'application/xhtml+xml', 'Accept-Language': 'spa' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`EU text: HTTP ${res.status}`);
  return { text: htmlToText(await res.text()).slice(0, maxChars), effectiveFrom: null };
}
