// "Key current law" (F2, decision L2): a short fixed list of requirements every NDA is checked
// against, besides the approved changes. Stored in legal_baseline/{id} (admins edit and activate
// them); these defaults seed it. NOT legal advice — they stay marked "pending lawyer validation"
// until an admin ticks it.

import type { ClauseKey } from '@/lib/contracts/types';
import type { ChangeSeverity, LegalJurisdiction, LegalTopic } from './types';

export interface BaselineItem {
  id: string;
  jurisdiction: LegalJurisdiction;
  title: string;
  url: string;
  summary: string;
  requirement: string;
  severity: ChangeSeverity;
  suggestedClause: string | null;
  topics: LegalTopic[];
  clauseKeys: ClauseKey[];
  contractTypes: ('nda' | 'service' | 'other')[];
  active: boolean;
  validatedByLawyer: boolean;
  updatedAt?: string;
}

export const DEFAULT_BASELINE: Omit<BaselineItem, 'updatedAt'>[] = [
  {
    id: 'es-informantes-ley-2-2023',
    jurisdiction: 'ES',
    title: 'Ley 2/2023, de 20 de febrero, reguladora de la protección de las personas que informen sobre infracciones normativas y de lucha contra la corrupción',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-4513',
    summary: 'Protege a quien comunica infracciones por los canales internos o externos o ante las autoridades. Los pactos que limiten ese derecho o impidan informar no surten efecto.',
    requirement: 'El NDA no debe impedir ni penalizar comunicar posibles infracciones por los canales previstos en la Ley 2/2023 o ante autoridades competentes; conviene una excepción expresa.',
    severity: 'critical',
    suggestedClause: 'Nada de lo dispuesto en este Acuerdo impedirá a las Partes comunicar posibles infracciones a través de los canales internos o externos previstos en la Ley 2/2023, de 20 de febrero, ni ante las autoridades competentes, ni dará lugar a responsabilidad alguna por ello.',
    topics: ['whistleblowing'],
    clauseKeys: ['whistleblower_carveout', 'permitted_disclosure'],
    contractTypes: ['nda', 'service'],
    active: true,
    validatedByLawyer: false,
  },
  {
    id: 'es-secretos-empresariales-ley-1-2019',
    jurisdiction: 'ES',
    title: 'Ley 1/2019, de 20 de febrero, de Secretos Empresariales',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2019-2364',
    summary: 'Define el secreto empresarial (información secreta, con valor empresarial por ser secreta y protegida con medidas razonables) y considera lícita su obtención por descubrimiento independiente, ingeniería inversa o en ejercicio de derechos de información de los trabajadores.',
    requirement: 'La definición de información confidencial y las exclusiones deben ser coherentes con la Ley 1/2019 (descubrimiento independiente, ingeniería inversa lícita, información pública) y el NDA debe prever medidas razonables de protección.',
    severity: 'important',
    suggestedClause: 'No tendrá la consideración de Información Confidencial la que (i) sea de dominio público sin incumplimiento de este Acuerdo, (ii) obrase lícitamente en poder de la Parte Receptora antes de su revelación, (iii) haya sido desarrollada de forma independiente por la Parte Receptora, o (iv) se obtenga lícitamente de un tercero no sujeto a deber de confidencialidad, todo ello conforme a la Ley 1/2019, de Secretos Empresariales.',
    topics: ['trade_secrets'],
    clauseKeys: ['definition_confidential_info', 'exclusions'],
    contractTypes: ['nda', 'service'],
    active: true,
    validatedByLawyer: false,
  },
  {
    id: 'eu-datos-personales-rgpd',
    jurisdiction: 'EU',
    title: 'Reglamento (UE) 2016/679 (RGPD) y Ley Orgánica 3/2018 (LOPDGDD)',
    url: 'https://www.boe.es/buscar/doc.php?id=DOUE-L-2016-80807',
    summary: 'Si la información intercambiada incluye datos personales, su tratamiento debe cumplir el RGPD (base jurídica, finalidad, seguridad, plazo de conservación y, en su caso, encargo de tratamiento).',
    requirement: 'Si el NDA puede implicar intercambio de datos personales, debe incluir una cláusula de protección de datos (finalidad limitada, medidas de seguridad, supresión o devolución y, si procede, contrato de encargo del art. 28 RGPD).',
    severity: 'important',
    suggestedClause: 'Si la Información Confidencial incluyera datos personales, las Partes los tratarán conforme al Reglamento (UE) 2016/679 y a la Ley Orgánica 3/2018, exclusivamente para la finalidad de este Acuerdo, aplicando medidas técnicas y organizativas apropiadas, y los suprimirán o devolverán a su término. Si una Parte tratara datos por cuenta de la otra, suscribirán el correspondiente contrato de encargo del tratamiento.',
    topics: ['personal_data'],
    clauseKeys: ['personal_data', 'return_destruction'],
    contractTypes: ['nda', 'service'],
    active: true,
    validatedByLawyer: false,
  },
  {
    id: 'es-no-competencia-et-art-21',
    jurisdiction: 'ES',
    title: 'Estatuto de los Trabajadores, art. 21.2 (pacto de no competencia postcontractual)',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430',
    summary: 'Con trabajadores, el pacto de no competencia tras extinguirse el contrato no puede superar dos años (técnicos) o seis meses (resto), exige un interés industrial o comercial efectivo y una compensación económica adecuada.',
    requirement: 'Solo si el NDA incluye no competencia y una parte es o será trabajador: duración dentro de los límites del art. 21.2 ET, interés efectivo y compensación económica adecuada; si no, el pacto es nulo. En NDAs entre empresas, no aplica.',
    severity: 'critical',
    suggestedClause: null,
    topics: ['employment'],
    clauseKeys: ['non_compete'],
    contractTypes: ['nda'],
    active: true,
    validatedByLawyer: false,
  },
  {
    id: 'eu-ia-uso-informacion',
    jurisdiction: 'EU',
    title: 'Uso de información confidencial en herramientas de inteligencia artificial (Reglamento (UE) 2024/1689 y buenas prácticas)',
    url: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
    summary: 'Introducir información confidencial en servicios de IA de terceros puede suponer una revelación no autorizada. Es buena práctica regularlo expresamente.',
    requirement: 'Recomendable que el NDA prohíba introducir la Información Confidencial en sistemas de IA de terceros sin consentimiento previo y por escrito, o que fije condiciones para hacerlo.',
    severity: 'recommended',
    suggestedClause: 'La Parte Receptora no introducirá la Información Confidencial en sistemas de inteligencia artificial o servicios de terceros que puedan almacenarla, utilizarla para su entrenamiento o revelarla, salvo consentimiento previo y por escrito de la Parte Divulgadora.',
    topics: ['ai'],
    clauseKeys: ['ai_tools_use'],
    contractTypes: ['nda', 'service'],
    active: true,
    validatedByLawyer: false,
  },
];
