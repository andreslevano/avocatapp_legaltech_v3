// MOBIFORWORK S.L. — Contrato de Prestación de Servicios (collaborator, persona física).
// Source: "MFW Contrato Servicios Plantilla 1.docx", stored in Storage
// org_templates/mobilityforwork.es/servicios/v1/ and described in Firestore
// org_templates/mobilityforwork.es_servicios. Pure — unit tested.
//
// Deterministic like the NDA template: the text is reproduced verbatim and only the fields marked
// "xxx" in the source (date, collaborator, rate) plus the Pool de Recursos start date and initial
// period are filled in. Service type and duration default to the template's own wording.

import { amountToSpanish, formatAmount, numberToSpanish, spanishDate, type Currency } from './spanish-numbers';

export const MFW_SERVICES_TEMPLATE = {
  id: 'mobilityforwork.es_servicios',
  version: 'v1',
  domain: 'mobilityforwork.es',
  company: 'MOBIFORWORK S.L.',
  cif: 'ESB22430706',
  sourceFile: 'MFW Contrato Servicios Plantilla 1.docx',
  defaultService: 'consultoría funcional',
  defaultDuration: 'hasta final de proyecto',
  defaultInitialMonths: 2,
  defaultCurrency: 'USD' as Currency,
} as const;

export interface MfwServicesInput {
  fechaContrato: string;           // YYYY-MM-DD
  colaborador: {
    nombre?: string;
    nacionalidad?: string;
    domicilio?: string;
    documento?: string;            // e.g. "DNI 12345678Z", "Pasaporte X1234567"
    email?: string;
  };
  servicio?: string;               // PRIMERA: "servicios de {servicio}"
  duracion?: string;               // SEGUNDA: "duración {duracion}"
  inicioPool: string;              // TERCERA: Pool de Recursos start (YYYY-MM-DD)
  mesesIniciales?: number;         // TERCERA: initial period in months
  tarifaHora?: number | null;      // TERCERA: hourly rate
  moneda?: Currency;
  /** LA EMPRESA's representative ID — personal data, kept out of the code: stored in Firestore
   *  org_templates/mobilityforwork.es_servicios.fixed and served by /api/org-templates/[id]. */
  empresaDni?: string | null;
  // Pending legal approval by MOBIFORWORK — v2 payment models
  /** TERCERA payment model. Default 'horas' = the v1 text, unchanged. */
  modalidadPago?: MfwPaymentModel;
  /** Total fee for 'unico_fin' and 'hitos'. */
  importeTotal?: number | null;
  /** Expected end of the course (YYYY-MM-DD), optional. */
  fechaFinCurso?: string | null;
  /** 'hitos': payment calendar, all of one `tipo`. */
  hitos?: MfwMilestone[];
  /** DECIMOTERCERA. PACTOS ADICIONALES — the user's text, verbatim (sanitised). */
  pactosAdicionales?: MfwExtraClause[];
}

export type MfwPaymentModel = 'horas' | 'unico_fin' | 'hitos';
export interface MfwMilestone { tipo: 'importe' | 'porcentaje'; valor: number; cuando: 'fecha' | 'fin_curso'; fecha?: string | null }
export interface MfwExtraClause { titulo?: string; texto: string }

export const MFW_EXTRA_CLAUSE_MAX_CHARS = 2000;

const v = (value: string | undefined, placeholder: string) => {
  const t = (value ?? '').replace(/\s+/g, ' ').trim().replace(/\*/g, '');
  return t ? `**${t}**` : `[${placeholder}]`;
};
const plain = (value: string | undefined, placeholder: string) => {
  const t = (value ?? '').replace(/\s+/g, ' ').trim().replace(/\*/g, '');
  return t || `[${placeholder}]`;
};

function monthsText(n: number): string {
  return `${numberToSpanish(n, true)} (${n}) ${n === 1 ? 'mes' : 'meses'}`;
}

function rateText(rate: number | null | undefined, currency: Currency): string {
  if (!rate || !(rate > 0)) return `[TARIFA POR HORA EN LETRA] (${currency} [IMPORTE])`;
  return `**${amountToSpanish(rate, currency)} (${currency} ${formatAmount(rate)})**`;
}

// ── v2: payment models and additional agreements ────────────────────────────
// Pending legal approval by MOBIFORWORK — v2 payment models

const PAYMENT_APPROVAL = 'siempre que los servicios prestados hayan sido debidamente justificados y aprobados conforme al procedimiento establecido entre las partes.';
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const isIso = (d: string | null | undefined): d is string => !!d && ISO.test(d);
const toCents = (n: number) => Math.round(n * 100);
const PCT_TOLERANCE = 0.01 + 1e-9;

function amountText(amount: number | null | undefined, currency: Currency, placeholder: string): string {
  if (amount == null || !(amount > 0)) return `[${placeholder}] (${currency} [IMPORTE])`;
  return `**${amountToSpanish(amount, currency)} (${currency} ${formatAmount(amount)})**`;
}

function endOfCourse(fechaFinCurso: string | null | undefined): string {
  return `a la finalización del curso o servicio${isIso(fechaFinCurso) ? `, prevista para el día **${spanishDate(fechaFinCurso)}**` : ''}`;
}

/** Amount of each milestone. Percentages are rounded to cents; the difference goes on the last one,
 *  so the amounts always add up to the total (3 × 33,33 % of 1.000 → 333,30 + 333,30 + 333,40). */
export function milestoneAmounts(hitos: MfwMilestone[], total: number | null | undefined): (number | null)[] {
  if (hitos.length === 0) return [];
  if (hitos.every(h => h.tipo === 'importe')) return hitos.map(h => (h.valor > 0 ? h.valor : null));
  if (total == null || !(total > 0)) return hitos.map(() => null);
  const totalCents = toCents(total);
  const cents = hitos.map(h => Math.round((totalCents * h.valor) / 100));
  // The calendar always pays the whole total: the last payment takes the rounding difference.
  cents[cents.length - 1] = totalCents - cents.slice(0, -1).reduce((a, c) => a + c, 0);
  return cents.map(c => c / 100);
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/** TERCERA payment paragraphs for 'unico_fin' / 'hitos' (they replace the Pool de Recursos, rate and invoice paragraphs). */
function paymentParagraphs(input: MfwServicesInput, moneda: Currency): string {
  const total = amountText(input.importeTotal, moneda, 'IMPORTE TOTAL EN LETRA');
  if (input.modalidadPago === 'unico_fin') {
    return `LA EMPRESA abonará a EL COLABORADOR la cantidad total de ${total} por la prestación de los servicios objeto del presente contrato, que se hará efectiva ${endOfCourse(input.fechaFinCurso)}. EL COLABORADOR emitirá la correspondiente factura a la finalización del servicio y LA EMPRESA efectuará el pago dentro de los treinta (30) días siguientes a la fecha de recepción de la factura, ${PAYMENT_APPROVAL}`;
  }
  const hitos = input.hitos ?? [];
  const amounts = milestoneAmounts(hitos, input.importeTotal);
  const lines = hitos.map((h, i) => {
    const amount = amountText(amounts[i], moneda, 'IMPORTE EN LETRA');
    const pct = h.tipo === 'porcentaje' && h.valor > 0 ? `, equivalente al ${formatAmount(h.valor)} % del total` : '';
    const when = h.cuando === 'fin_curso'
      ? endOfCourse(input.fechaFinCurso)
      : `el día ${isIso(h.fecha) ? `**${spanishDate(h.fecha)}**` : '[FECHA]'}`;
    return `${LETTERS[i] ?? String(i + 1)}) ${amount}${pct}, ${when}.`;
  });
  return [
    `LA EMPRESA abonará a EL COLABORADOR la cantidad total de ${total}, que se hará efectiva conforme al siguiente calendario de pagos:`,
    ...lines,
    `Para cada uno de los pagos, EL COLABORADOR emitirá la correspondiente factura y LA EMPRESA efectuará el pago dentro de los treinta (30) días siguientes a la fecha de recepción de la factura, ${PAYMENT_APPROVAL}`,
  ].join('\n\n');
}

/** The user's text, verbatim but unable to break the document: no markdown control characters,
 *  no "____" runs (signature/date anchors) and no backslashes (DocuSign anchor syntax). */
export function sanitizeClauseText(text: string): string {
  return text
    .replace(/[*#>\\]/g, '')
    .replace(/_{4,}/g, '___')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^-+\s*/, '');
}

function extraClauses(pactos: MfwExtraClause[] | undefined): string {
  const items = (pactos ?? []).map(p => ({ titulo: sanitizeClauseText(p.titulo ?? ''), texto: sanitizeClauseText(p.texto ?? '') })).filter(p => p.texto);
  if (items.length === 0) return '';
  const paras = items.map((p, i) => `13.${i + 1}. ${p.titulo ? `**${p.titulo}.** ` : ''}${p.texto}`);
  return `## DECIMOTERCERA. PACTOS ADICIONALES\n\n${paras.join('\n\n')}\n\n`;
}

const hasExtraClauses = (input: MfwServicesInput) => (input.pactosAdicionales ?? []).some(p => sanitizeClauseText(p.texto ?? ''));

/** 'v1' = the original template (hourly model, no additional agreements); anything else 'v2'. */
export function mfwServicesVersion(input: MfwServicesInput): 'v1' | 'v2' {
  return (input.modalidadPago ?? 'horas') === 'horas' && !hasExtraClauses(input) ? 'v1' : 'v2';
}

/** Spanish validation messages for the payment model and additional agreements (empty = valid). */
export function validateMfwPayment(input: MfwServicesInput): string[] {
  const errors: string[] = [];
  const model = input.modalidadPago ?? 'horas';
  const total = input.importeTotal ?? 0;
  if (model !== 'horas' && !(total > 0)) errors.push('Indica el importe total (mayor que 0).');
  if (isIso(input.fechaFinCurso) && isIso(input.fechaContrato) && input.fechaFinCurso < input.fechaContrato) {
    errors.push('La fecha de fin del curso no puede ser anterior a la fecha del contrato.');
  }

  if (model === 'hitos') {
    const hitos = input.hitos ?? [];
    if (hitos.length < 2) errors.push('Los pagos parciales necesitan al menos dos pagos.');
    const tipos = new Set(hitos.map(h => h.tipo));
    if (tipos.size > 1) errors.push('Todos los pagos deben ser importes o todos porcentajes.');
    if (hitos.some(h => !(h.valor > 0))) errors.push('Cada pago debe tener un valor mayor que 0.');
    if (tipos.size === 1 && hitos.length > 0) {
      if (hitos[0].tipo === 'porcentaje') {
        const sum = hitos.reduce((a, h) => a + h.valor, 0);
        // ±0,01 so thirds (33,33 × 3) are accepted; the amounts still add up to the total.
        if (Math.abs(sum - 100) > PCT_TOLERANCE) errors.push(`Los porcentajes deben sumar 100 % (ahora suman ${formatAmount(Math.round(sum * 100) / 100)} %).`);
      } else if (total > 0) {
        const sum = hitos.reduce((a, h) => a + toCents(h.valor), 0);
        if (Math.abs(sum - toCents(total)) > 1) errors.push(`Los importes deben sumar el importe total (ahora suman ${formatAmount(sum / 100)}).`);
      }
    }
    hitos.forEach((h, i) => {
      if (h.cuando !== 'fecha') return;
      const n = i + 1;
      if (!isIso(h.fecha)) { errors.push(`Indica la fecha del pago ${n}.`); return; }
      if (isIso(input.fechaContrato) && h.fecha < input.fechaContrato) errors.push(`La fecha del pago ${n} es anterior a la fecha del contrato.`);
      if (isIso(input.fechaFinCurso) && h.fecha > input.fechaFinCurso) errors.push(`La fecha del pago ${n} es posterior a la fecha de fin del curso.`);
    });
    const finIdx = hitos.map((h, i) => (h.cuando === 'fin_curso' ? i : -1)).filter(i => i >= 0);
    if (finIdx.length > 1) errors.push('Solo puede haber un pago al finalizar el curso.');
    else if (finIdx.length === 1 && finIdx[0] !== hitos.length - 1) errors.push('El pago al finalizar el curso debe ser el último.');
  }

  (input.pactosAdicionales ?? []).forEach((p, i) => {
    const t = (p.texto ?? '').trim();
    if (!t) errors.push(`El pacto adicional ${i + 1} está vacío.`);
    else if (t.length > MFW_EXTRA_CLAUSE_MAX_CHARS) errors.push(`El pacto adicional ${i + 1} supera los ${formatAmount(MFW_EXTRA_CLAUSE_MAX_CHARS)} caracteres.`);
  });
  return errors;
}

export function renderMfwServices(input: MfwServicesInput): string {
  const c = input.colaborador;
  const meses = input.mesesIniciales && input.mesesIniciales > 0 ? Math.round(input.mesesIniciales) : MFW_SERVICES_TEMPLATE.defaultInitialMonths;
  const moneda = input.moneda ?? MFW_SERVICES_TEMPLATE.defaultCurrency;
  const servicio = (input.servicio ?? '').trim() || MFW_SERVICES_TEMPLATE.defaultService;
  const duracion = (input.duracion ?? '').trim() || MFW_SERVICES_TEMPLATE.defaultDuration;
  const modelo = input.modalidadPago ?? 'horas';
  // v1 text — the 'horas' model (default). Byte-for-byte the original template.
  const hourly = `A partir del día ${input.inicioPool ? `**${spanishDate(input.inicioPool)}**` : '[FECHA DE INICIO]'}, EL COLABORADOR prestará sus servicios bajo una modalidad de Pool de Recursos, de carácter temporal, mediante la cual estará disponible para la ejecución de tareas o proyectos específicos que le sean asignados por LA EMPRESA, sin que ello implique una obligación de asignación continua de trabajo por parte de LA EMPRESA ni una obligación de disponibilidad exclusiva por parte de EL COLABORADOR.

La presente modalidad tendrá una vigencia inicial de ${monthsText(meses)}, contados desde su entrada en vigor. Transcurrido dicho período, las partes revisarán conjuntamente las condiciones de colaboración y podrán acordar su continuidad, modificación o sustitución por otra modalidad contractual.

Para cada tarea, incidencia, proyecto o servicio solicitado por LA EMPRESA, EL COLABORADOR deberá proporcionar previamente una estimación del tiempo requerido para su ejecución, la cual deberá ser validada o aprobada por LA EMPRESA antes del inicio de los trabajos, salvo casos de urgencia debidamente justificados.

LA EMPRESA abonará a EL COLABORADOR la cantidad de ${rateText(input.tarifaHora, moneda)} por cada hora efectivamente trabajada y validada, de acuerdo con las tareas realizadas y aceptadas por LA EMPRESA.

EL COLABORADOR emitirá la correspondiente factura detallando las tareas realizadas y las horas dedicadas a cada una de ellas. LA EMPRESA efectuará el pago dentro de los treinta (30) días siguientes a la fecha de recepción de la factura, siempre que los servicios prestados hayan sido debidamente justificados y aprobados conforme al procedimiento establecido entre las partes.

`;
  return `# CONTRATO DE PRESTACIÓN DE SERVICIOS

En Barbastro a ${input.fechaContrato ? spanishDate(input.fechaContrato) : '[FECHA]'}

## REUNIDOS

De una parte, Félix Dia Morales, de nacionalidad española, mayor de edad, con DNI ${plain(input.empresaDni ?? undefined, 'DNI DEL REPRESENTANTE')} en nombre y representación de MOBIFORWORK S.L., con domicilio en la Avenida del Cinca nº 6, 1ª 22300 Barbastro (Huesca), y con CIF ESB22430706, en adelante, 'LA EMPRESA'.

Y, de otra parte, ${v(c.nombre, 'NOMBRE DEL COLABORADOR')}, de nacionalidad ${v(c.nacionalidad, 'NACIONALIDAD')} mayor de edad y en representación propia, con domicilio en ${v(c.domicilio, 'DOMICILIO')}, con Documento ${v(c.documento, 'DNI, PASAPORTE, C.C.')}, 'EL COLABORADOR'.

Ambas partes se reconocen mutuamente capacidad legal suficiente para otorgamiento del presente Contrato de Prestación de Servicios y en su virtud,

## EXPONEN

I.- Que LA EMPRESA es una sociedad mercantil válidamente constituida de acuerdo con la legislación española, cuyo objeto social incluye entre otras actividades la prestación de servicios de consultoría y de formación sobre aplicaciones informáticas.

II.- Que LA EMPRESA está interesada en contratar los servicios de EL COLABORADOR que cuenta con los medios materiales y personales necesarios para desarrollar las actividades previstas en el presente Contrato.

III.- Que, de acuerdo con los expositivos precedentes, ambas partes han convenido la formalización del presente Contrato de Prestación de Servicios, que se regirá por lo establecido en el Código Civil y de Comercio, y de manera especial por las siguientes cláusulas:

## CLÁUSULAS

## PRIMERA. OBJETO

EL COLABORADOR se compromete a prestar servicios de ${servicio === MFW_SERVICES_TEMPLATE.defaultService ? servicio : `**${servicio.replace(/\*/g, '')}**`}, de forma remota y si se requiriera de forma presencial, en régimen estrictamente mercantil, sin que exista en ningún momento relación laboral entre las partes.

## SEGUNDA. DURACIÓN

El presente contrato tiene una duración ${duracion === MFW_SERVICES_TEMPLATE.defaultDuration ? duracion : `**${duracion.replace(/\*/g, '')}**`}, a contar desde la fecha de la firma. Podrá prorrogarse previo acuerdo expreso y escrito de las partes.

## TERCERA. TARIFAS, HONORARIOS, FACTURACIÓN Y FORMA DE PAGO

${modelo === 'horas' ? hourly : `${paymentParagraphs(input, moneda)}

`}LA EMPRESA reembolsará los gastos de desplazamiento, alojamiento, manutención u otros gastos necesarios para la prestación del servicio únicamente cuando hayan sido previamente autorizados por LA EMPRESA y, en su caso, resulten repercutibles al cliente final. EL COLABORADOR deberá presentar los correspondientes justificantes o facturas para su reembolso.

## CUARTA. - CONFIDENCIALIDAD

EL COLABORADOR se compromete de manera expresa, tanto durante la vigencia del contrato, como después de su extinción, a no difundir, transmitir, revelar a terceras personas cualquier información de LA EMPRESA, a la que tenga acceso como consecuencia del desempeño de su actividad laboral, ni a utilizar tal información en interés propio o de sus familiares o amigos.

La prohibición establecida en el párrafo anterior se extiende a la reproducción en cualquier soporte informático de LA EMPRESA, a la que tenga acceso sobre clientes, procedimientos y sistemas de organización, programas informáticos o cualquier otro tipo de información interna, salvo que tal información sea estrictamente necesaria para el desarrollo del contenido inherente de su puesto de trabajo y se realice dentro del ámbito de LA EMPRESA.

Todas las notas, informes y cualesquiera otros documentos (incluyendo los almacenados en dispositivos informáticos), elaborados por LA EMPRESA durante la vigencia del presente contrato y que se refieran a la actividad de LA EMPRESA son propiedad de LA EMPRESA y serán diligentemente custodiados en LA EMPRESA.

La vulneración de este compromiso será considerada como causa justificada de extinción del presente contrato, sin derecho a la percepción de indemnización alguna.

En el supuesto de incumplimiento del compromiso asumido y con independencia de la extinción del contrato, LA EMPRESA se reserva el derecho a reclamar el resarcimiento de los daños y perjuicios que le pudieran causar como consecuencia de la vulneración del deber de confidencialidad y secreto profesional pactado en la presente clausula.

## QUINTA. - UTILIZACIÓN DE MEDIOS INFORMÁTICOS

Los medios informáticos, incluido la cuenta de usuario Microsoft Office 365 (correo electrónico, Teams…), son herramientas de trabajo propiedad de la empresa, tanto en relación con el hardware y con el software instalado como en relación con los contenidos, y como tales herramientas deberán ser consideradas, entando destinados los mismo al uso estrictamente profesional en función de los contenidos laborales encomendados a EL COLABORADOR. Por ello, LA EMPRESA podrá realizar los controles que estime oportunos sobre la utilización de tales medios puestos a su disposición, incluido el acceso a la cuenta de usuario Office365 y a cualquier archivo que pudiera tener EL COLABORADOR en el equipo propiedad de LA EMPRESA, a lo cual ésta expresamente autoriza, dado que los contenidos se considerarán a todos los efectos como documentación de LA EMPRESA.

EL COLABORADOR, será responsable del uso de su contraseña personal, así como de la custodia de todos los documentos existentes en los equipos de LA EMPRESA y cuenta de Office 365, no pudiendo hacer uso de su contenido con fines distintos a los laborales, revelar o difundir su contenido ni obtener copias mediante cualquier procedimiento para utilizarlas fuera del ámbito de la empresa, salvo que tenga autorización de LA EMPRESA para ello.

## SEXTA. PROPIEDAD INTELECTUAL E INDUSTRIAL

Cualquier marca registrada, diseño u otra que dé lugar a derechos de propiedad intelectual o industrial realizado por EL COLABORADOR durante su relación mercantil (en colaboración o no con un tercero), que afecte o que esté relacionada con las actividades de LA EMPRESA o sea susceptible de ser utilizada o adaptada para su uso por la misma, deberá ser comunicada de inmediato a LA EMPRESA y pertenecerá, y será de la exclusiva propiedad de LA EMPRESA.

EL COLABORADOR renuncia a cualesquiera derechos pudieran corresponderle comprometiéndose expresamente a su cesión a LA EMPRESA por tiempo indefinido y ámbito universal y, a petición de LA EMPRESA y a costa de la misma, ejecutará los documentos que resulten precisos, obligándose a otorgar a LA EMPRESA por medio del presente acuerdo de poderes de representación para realizar en su nombre los actos necesarios para ejercer el contenido de esta estipulación y otorgar todos los derechos a dicha compañía sin limitación alguna.

## SÉPTIMA. SUBROGACIÓN Y CESIÓN

El presente contrato no podrá ser subrogado o cedido a terceros salvo previo acuerdo escrito entre las partes.

## OCTAVA. FINALIZACIÓN DEL CONTRATO

El contrato podrá ser cancelado unilateralmente por cualquiera de las partes, advirtiendo este hecho con al menos 30 días naturales de antelación.

Si EL COLABORADOR incumpliera los términos de este contrato, renunciaría al cobro de los tiempos imputados en el mes en curso.

## NOVENA. Independencia de las partes

Las partes declaran expresamente que el presente contrato es de naturaleza mercantil y no laboral. EL COLABORADOR organizará libremente su actividad, sin sujeción a jornada ni dependencia jerárquica de LA EMPRESA.

## DECIMA. NO COMPETENCIA

Dada la alta especialización técnica de los servicios que presta EL COLABORADOR, éste se compromete a no prestar sus servicios para cualesquiera clientes con los que haya trabajado por mediación de LA EMPRESA, ni directamente ni a través de otra empresa, durante la vigencia de este contrato o en los doce meses siguientes a su finalización, salvo exoneración expresa de la otra parte de esta obligación.

La violación de esta cláusula se sancionará con la obligación de EL COLABORADOR de abonar a LA EMPRESA una cantidad equivalente al 40 % de la remuneración que perciba por su trabajo en el cliente de LA EMPRESA, hasta el cumplimiento de los doce meses siguientes a la finalización del presente contrato.

## UNDÉCIMA. PROTECCIÓN DE DATOS

Todos los datos personales proporcionados tratados por LA EMPRESA están protegidos por las medidas adecuadas de seguridad previstas en la legislación vigente.

### Responsable del Tratamiento

De conformidad con la normativa vigente de Protección de Datos de Carácter Personal, informa que los datos proporcionados en este contrato, así como toda la información resultante de la gestión y mantenimiento de la relación laboral vigente, será incorporada a nuestro Fichero de RRHH cuyo titular y responsable del tratamiento es LA EMPRESA, con domicilio en la Avda. Pirineos 3 altillo A, 22300 Barbastro (Huesca), y con CIF ESB22430706.

Usted podrá contactar con el responsable o delegado de Protección de Datos en el correo pmo@mobilityforwork.com o mediante carta dirigida al domicilio social de LA EMPRESA.

### Finalidad y Legitimación del tratamiento

Los datos personales que nos proporcione serán utilizados por LA EMPRESA para las siguientes finalidades.

- Gestionar la relación LA EMPRESA - Interesado.
- Consultar, una vez concluida la relación, con la finalidad de participar en procesos de selección desarrollados por LA EMPRESA.

### Comunicación y Cesión de Datos a Terceros

Los datos facilitados podrán ser comunicados a:

- Organismos Públicos que obligue la Ley vigente.
- Empresas privadas con las que se contrate tratamiento de datos necesarios para la ejecución de las obligaciones derivadas de la relación laboral.

### Derechos

Usted puede ejercer los derechos sobre los datos suministrados recogidos en el art. 13 del RGPD de acceso, rectificación o supresión, limitación de tratamiento, oposición del tratamiento de los datos personales facilitados.

Puede ejercer dichos derechos o revocar los consentimientos de tratamiento dados enviando una petición al correo electrónico info@mobilityforwork.es, incluyendo una copia del DNI o pasaporte.

Para el ejercicio de los derechos o cualquier aclaración que precise puede dirigir un correo electrónico a la dirección pmo@mobilityforwork.com, acreditando ser titular de los datos sobre los que quiere ejercer esos derechos.

Le informamos que usted puede presentar una reclamación ante la Autoridad de Control en materia de Protección de Datos competente si no obtiene satisfacción en el ejercicio de sus derechos.

## DUODÉCIMA. JURISDICCIÓN

El cumplimiento, ejecución e interpretación del presente contrato estará sujeto a la legislación española y, en caso de controversia, ambas Partes acuerdan someterse, con renuncia expresa a cualquier otro fuero que pudiera corresponderles, a la jurisdicción de los Juzgados y Tribunales de Barbastro.

${extraClauses(input.pactosAdicionales)}Y en prueba de conformidad, ambas partes firman el presente documento por duplicado, a un solo efecto y en lugar y fecha señalados en el encabezamiento.

## FIRMAS

**Por LA EMPRESA:**
Félix Dia Morales
Firma: ________________________

**Por El COLABORADOR:**
${plain(c.nombre, 'NOMBRE DEL COLABORADOR')}
Firma: ________________________
`;
}
