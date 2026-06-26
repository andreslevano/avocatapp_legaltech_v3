'use client';

import { useState, useRef, useCallback } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { saveAnalysisDocument, downloadAsWord, downloadAsPdf } from '@/lib/agent-export';
import { consumirCredito } from '@/lib/creditos';
import { getUserDocuments, type DocumentRecord } from '@/lib/storage-client';

// ── Types ─────────────────────────────────────────────────────────

const AREAS = ['Civil', 'Laboral', 'Mercantil', 'Administrativo', 'Penal'] as const;
type Area = (typeof AREAS)[number];
interface DocType { value: string; label: string; area: Area }
interface FieldDef { key: string; label: string; type: 'text' | 'textarea' | 'number' | 'date' | 'select'; placeholder?: string; options?: string[] }
interface Party { id: number; name: string; role: string; nif: string }
interface KeyDate { id: number; label: string; date: string }

// ── Document catalog ──────────────────────────────────────────────

const DOC_TYPES_BY_AREA: Record<Area, DocType[]> = {
  Civil: [
    { value: 'demanda_civil',          label: 'Demanda civil',                       area: 'Civil' },
    { value: 'contestacion_demanda',   label: 'Contestación a demanda',              area: 'Civil' },
    { value: 'recurso_apelacion',      label: 'Recurso de apelación',                area: 'Civil' },
    { value: 'escrito_alegaciones',    label: 'Escrito de alegaciones',              area: 'Civil' },
    { value: 'medidas_cautelares',     label: 'Solicitud de medidas cautelares',     area: 'Civil' },
  ],
  Laboral: [
    { value: 'demanda_laboral',        label: 'Demanda laboral',                     area: 'Laboral' },
    { value: 'reclamacion_cantidad',   label: 'Reclamación de cantidad',             area: 'Laboral' },
    { value: 'carta_despido',          label: 'Carta de despido',                    area: 'Laboral' },
    { value: 'conciliacion_previa',    label: 'Conciliación previa',                 area: 'Laboral' },
    { value: 'recurso_suplicacion',    label: 'Recurso de suplicación',              area: 'Laboral' },
  ],
  Mercantil: [
    { value: 'contrato_compraventa',   label: 'Contrato de compraventa',             area: 'Mercantil' },
    { value: 'nda',                    label: 'Acuerdo de confidencialidad (NDA)',   area: 'Mercantil' },
    { value: 'contrato_servicios',     label: 'Contrato de prestación de servicios',area: 'Mercantil' },
    { value: 'pacto_socios',           label: 'Pacto de socios',                     area: 'Mercantil' },
    { value: 'reclamacion_aseguradora',label: 'Reclamación a aseguradora',           area: 'Mercantil' },
  ],
  Administrativo: [
    { value: 'recurso_alzada',         label: 'Recurso de alzada',                   area: 'Administrativo' },
    { value: 'recurso_contencioso',    label: 'Recurso contencioso-administrativo',  area: 'Administrativo' },
    { value: 'solicitud_administrativa',label:'Solicitud administrativa',            area: 'Administrativo' },
    { value: 'reclamacion_patrimonial',label: 'Reclamación patrimonial',             area: 'Administrativo' },
    { value: 'denuncia_administrativa',label: 'Denuncia administrativa',             area: 'Administrativo' },
  ],
  Penal: [
    { value: 'denuncia_penal',         label: 'Denuncia penal',                      area: 'Penal' },
    { value: 'querella',               label: 'Querella criminal',                   area: 'Penal' },
    { value: 'escrito_defensa',        label: 'Escrito de defensa',                  area: 'Penal' },
    { value: 'recurso_reforma',        label: 'Recurso de reforma',                  area: 'Penal' },
    { value: 'solicitud_indulto',      label: 'Solicitud de indulto',                area: 'Penal' },
  ],
};

const SPECIFIC_FIELDS: Record<string, FieldDef[]> = {
  demanda_civil:           [{ key:'cuantia', label:'Cuantía reclamada (€)', type:'number', placeholder:'10.000' }, { key:'titulo_juridico', label:'Título jurídico', type:'select', options:['Responsabilidad contractual','Responsabilidad extracontractual','Reclamación de deuda','Daños y perjuicios','Otro'] }, { key:'juzgado', label:'Juzgado destinatario', type:'text', placeholder:'Juzgado de Primera Instancia nº X de...' }],
  contestacion_demanda:    [{ key:'num_autos', label:'Nº de autos', type:'text', placeholder:'Ordinario 123/2025' }, { key:'juzgado', label:'Juzgado', type:'text', placeholder:'Juzgado de Primera Instancia nº X de...' }, { key:'contrademanda', label:'¿Reconvención?', type:'select', options:['No','Sí'] }],
  recurso_apelacion:       [{ key:'fecha_sentencia', label:'Fecha sentencia recurrida', type:'date' }, { key:'num_autos', label:'Nº autos (1ª instancia)', type:'text', placeholder:'Ordinario 123/2025' }, { key:'organo_ad_quem', label:'Órgano ad quem', type:'text', placeholder:'Audiencia Provincial de...' }, { key:'motivos', label:'Motivos de apelación', type:'textarea', placeholder:'Infracción de norma, error valoración prueba...' }],
  escrito_alegaciones:     [{ key:'num_autos', label:'Nº de autos', type:'text', placeholder:'Ordinario 123/2025' }, { key:'fase_procesal', label:'Fase procesal', type:'select', options:['Instrucción','Juicio oral','Ejecución','Otro'] }, { key:'objeto', label:'Objeto de las alegaciones', type:'textarea', placeholder:'Describe el objeto concreto...' }],
  medidas_cautelares:      [{ key:'tipo_medida', label:'Tipo de medida', type:'select', options:['Embargo preventivo','Anotación preventiva','Prohibición de disponer','Secuestro judicial','Otra'] }, { key:'periculum', label:'Periculum in mora', type:'textarea', placeholder:'Riesgo concreto que justifica la urgencia...' }, { key:'caucion', label:'Caución ofrecida', type:'text', placeholder:'Importe o forma de garantía' }],
  demanda_laboral:         [{ key:'fecha_inicio', label:'Inicio relación laboral', type:'date' }, { key:'fecha_fin', label:'Fecha extinción', type:'date' }, { key:'tipo_despido', label:'Tipo de despido', type:'select', options:['Disciplinario','Objetivo','Colectivo (ERE)','Nulidad'] }, { key:'salario_anual', label:'Salario bruto anual (€)', type:'number', placeholder:'30.000' }, { key:'indemnizacion', label:'Indemnización reclamada (€)', type:'number', placeholder:'15.000' }],
  reclamacion_cantidad:    [{ key:'importe', label:'Importe reclamado (€)', type:'number', placeholder:'5.000' }, { key:'concepto', label:'Concepto', type:'select', options:['Salarios impagados','Horas extraordinarias','Gastos y dietas','Comisiones','Indemnización','Otro'] }, { key:'periodo', label:'Período reclamado', type:'text', placeholder:'Enero–Marzo 2025' }],
  carta_despido:           [{ key:'cargo', label:'Cargo del trabajador', type:'text', placeholder:'Técnico informático' }, { key:'fecha_efectiva', label:'Fecha efectiva del despido', type:'date' }, { key:'tipo_despido', label:'Tipo', type:'select', options:['Disciplinario','Objetivo'] }, { key:'causa', label:'Causa detallada', type:'textarea', placeholder:'Describe las causas...' }, { key:'preaviso', label:'Período de preaviso', type:'text', placeholder:'15 días / no aplica' }],
  conciliacion_previa:     [{ key:'smac', label:'Nº expediente SMAC', type:'text', placeholder:'SMAC-2025/XXXX' }, { key:'objeto', label:'Objeto de la conciliación', type:'textarea', placeholder:'Despido / reclamación de cantidad...' }, { key:'propuesta', label:'Propuesta de acuerdo', type:'textarea', placeholder:'Readmisión / indemnización de X€...' }],
  recurso_suplicacion:     [{ key:'sala_tsj', label:'Sala del TSJ', type:'text', placeholder:'TSJ de Madrid, Sala de lo Social' }, { key:'num_autos', label:'Nº autos de instancia', type:'text', placeholder:'Social 123/2025' }, { key:'motivos', label:'Motivos', type:'select', options:['Infracción procesal','Infracción de norma sustantiva','Error valoración prueba','Varios'] }, { key:'plazo', label:'Fecha límite', type:'date' }],
  contrato_compraventa:    [{ key:'descripcion_bien', label:'Descripción del bien', type:'textarea', placeholder:'Inmueble / vehículo / maquinaria...' }, { key:'precio', label:'Precio (€)', type:'number', placeholder:'50.000' }, { key:'forma_pago', label:'Forma de pago', type:'select', options:['Al contado','Aplazado','Financiado','Permuta'] }, { key:'garantias', label:'Garantías', type:'textarea', placeholder:'Condiciones de garantía...' }],
  nda:                     [{ key:'finalidad', label:'Finalidad / propósito', type:'textarea', placeholder:'Evaluación de posible acuerdo comercial...' }, { key:'duracion', label:'Duración', type:'text', placeholder:'2 años desde la firma' }, { key:'alcance', label:'Alcance de la info confidencial', type:'textarea', placeholder:'Tecnología, datos de clientes...' }, { key:'penalizacion', label:'Penalización por incumplimiento', type:'text', placeholder:'Indemnización de X€' }],
  contrato_servicios:      [{ key:'descripcion_servicio', label:'Descripción del servicio', type:'textarea', placeholder:'Desarrollo de software / asesoría...' }, { key:'tarifa', label:'Precio / tarifa', type:'text', placeholder:'3.000€/mes o 150€/hora' }, { key:'duracion', label:'Duración', type:'text', placeholder:'12 meses / indefinido' }, { key:'propiedad_intelectual', label:'Propiedad intelectual', type:'select', options:['Al cliente','Al proveedor','Compartida'] }, { key:'exclusividad', label:'Exclusividad', type:'select', options:['No','Sí — sectorial','Sí — total'] }],
  pacto_socios:            [{ key:'nombre_sociedad', label:'Nombre de la sociedad', type:'text', placeholder:'Empresa SL' }, { key:'capital', label:'Capital social (€)', type:'number', placeholder:'10.000' }, { key:'distribucion', label:'Distribución de participaciones', type:'textarea', placeholder:'Socio A: 60%, Socio B: 40%...' }, { key:'gobierno', label:'Órgano de gobierno', type:'select', options:['Administrador único','Administradores solidarios','Administradores mancomunados','Consejo de administración'] }, { key:'clausulas_salida', label:'Cláusulas de salida', type:'textarea', placeholder:'Tag-along, drag-along...' }],
  reclamacion_aseguradora: [{ key:'num_poliza', label:'Nº de póliza', type:'text', placeholder:'POL-XXXX-2025' }, { key:'aseguradora', label:'Aseguradora', type:'text', placeholder:'Mapfre / Allianz...' }, { key:'fecha_siniestro', label:'Fecha del siniestro', type:'date' }, { key:'descripcion_dano', label:'Descripción del daño', type:'textarea', placeholder:'Describe el siniestro...' }, { key:'importe', label:'Importe reclamado (€)', type:'number', placeholder:'20.000' }],
  recurso_alzada:          [{ key:'acto_impugnado', label:'Acto / resolución impugnada', type:'textarea', placeholder:'Referencia del acto...' }, { key:'organo_superior', label:'Órgano superior jerárquico', type:'text', placeholder:'Ministerio / Consejería...' }, { key:'plazo', label:'Fecha límite (1 mes)', type:'date' }, { key:'motivos', label:'Motivos de impugnación', type:'textarea', placeholder:'Infracción de ley, desviación de poder...' }],
  recurso_contencioso:     [{ key:'resolucion', label:'Resolución impugnada', type:'textarea', placeholder:'Referencia y fecha...' }, { key:'juzgado', label:'Juzgado / Sala competente', type:'text', placeholder:'Juzgado Contencioso-Administrativo nº X de...' }, { key:'fecha_notificacion', label:'Fecha de notificación', type:'date' }, { key:'fundamentos', label:'Fundamentos jurídicos', type:'textarea', placeholder:'Preceptos legales vulnerados...' }],
  solicitud_administrativa:[{ key:'organismo', label:'Organismo destinatario', type:'text', placeholder:'Dirección General de... / Ayuntamiento de...' }, { key:'objeto', label:'Objeto de la solicitud', type:'textarea', placeholder:'Descripción de lo que se solicita...' }, { key:'documentos_aportados', label:'Documentos aportados', type:'textarea', placeholder:'Lista de documentos adjuntos...' }],
  reclamacion_patrimonial: [{ key:'organismo_responsable', label:'Organismo responsable', type:'text', placeholder:'Administración General del Estado / CCAA...' }, { key:'causa_dano', label:'Causa del daño', type:'textarea', placeholder:'Acción u omisión de la Administración...' }, { key:'nexo_causal', label:'Nexo causal', type:'textarea', placeholder:'Relación causa-efecto...' }, { key:'importe', label:'Importe reclamado (€)', type:'number', placeholder:'50.000' }],
  denuncia_administrativa: [{ key:'organismo', label:'Organismo competente', type:'text', placeholder:'AEPD / Inspección de Trabajo...' }, { key:'infractor', label:'Infractor', type:'text', placeholder:'Nombre o razón social' }, { key:'tipo_infraccion', label:'Tipo de infracción', type:'textarea', placeholder:'Describe la infracción...' }, { key:'fecha_lugar', label:'Fecha y lugar', type:'text', placeholder:'15/03/2025 en Madrid' }],
  denuncia_penal:          [{ key:'denunciado', label:'Denunciado (si conocido)', type:'text', placeholder:'Nombre o "persona desconocida"' }, { key:'tipo_delito', label:'Tipo de delito', type:'text', placeholder:'Estafa / lesiones / robo...' }, { key:'fecha_lugar', label:'Fecha y lugar de los hechos', type:'text', placeholder:'15/03/2025 en Madrid' }, { key:'dano_sufrido', label:'Daño sufrido', type:'textarea', placeholder:'Perjuicio económico, físico o moral...' }, { key:'pruebas', label:'Pruebas disponibles', type:'textarea', placeholder:'Documentos, testigos, capturas...' }],
  querella:                [{ key:'tipo_delito', label:'Tipo de delito y art. CP', type:'text', placeholder:'Estafa art. 248 CP' }, { key:'juzgado', label:'Juzgado de instrucción', type:'text', placeholder:'Juzgado de Instrucción nº X de...' }, { key:'pruebas', label:'Pruebas aportadas', type:'textarea', placeholder:'Documentos, periciales, testigos...' }, { key:'fianza', label:'Fianza', type:'text', placeholder:'Importe o "exoneración de fianza"' }],
  escrito_defensa:         [{ key:'cargos', label:'Cargos / acusación', type:'textarea', placeholder:'Calificación provisional del ministerio fiscal...' }, { key:'calificacion_alternativa', label:'Calificación alternativa de la defensa', type:'textarea', placeholder:'Tipificación que propone la defensa...' }, { key:'prueba_descargo', label:'Prueba de descargo', type:'textarea', placeholder:'Testigos, documentos, periciales...' }, { key:'circunstancias', label:'Circunstancias modificativas', type:'select', options:['Ninguna','Atenuante','Eximente','Agravante (del acusador)'] }],
  recurso_reforma:         [{ key:'auto_impugnado', label:'Auto impugnado', type:'textarea', placeholder:'Referencia del auto y fecha...' }, { key:'juzgado', label:'Juzgado', type:'text', placeholder:'Juzgado de instrucción nº X de...' }, { key:'motivos', label:'Motivos del recurso', type:'textarea', placeholder:'Infracción legal o error del juzgado...' }, { key:'resolucion_solicitada', label:'Resolución solicitada', type:'textarea', placeholder:'Revocación / archivo / otra...' }],
  solicitud_indulto:       [{ key:'delito_condena', label:'Delito y condena', type:'textarea', placeholder:'Condena por X delito a Y años de prisión...' }, { key:'cumplimiento', label:'Estado de cumplimiento', type:'text', placeholder:'Cumplidos X años de Y totales' }, { key:'motivos', label:'Motivos de clemencia', type:'textarea', placeholder:'Reinserción, enfermedad, razones familiares...' }, { key:'informe_conducta', label:'Informe de conducta penitenciaria', type:'select', options:['Muy favorable','Favorable','Normal','No disponible'] }],
};

const VALIDATION_TIPS: Record<string, string> = {
  demanda_civil:           'Adjunte el contrato, factura o documento que acredite el título jurídico de la reclamación.',
  contestacion_demanda:    'Responda a cada hecho de la demanda. Asegúrese de tener copia del escrito de la parte actora.',
  recurso_apelacion:       'Plazo estricto: 20 días desde la notificación de sentencia. Verifique que no ha prescrito.',
  escrito_alegaciones:     'Cite jurisprudencia del TS o TC según corresponda para reforzar la posición.',
  medidas_cautelares:      'Debe acreditar fumus boni iuris y periculum in mora. Prepare documentación que justifique la urgencia.',
  demanda_laboral:         'Requiere previa conciliación en el SMAC. Adjunte carta de despido, nóminas y contrato.',
  reclamacion_cantidad:    'La reclamación de cantidad requiere prueba documental — adjunte facturas, nóminas o recibos.',
  carta_despido:           'El despido disciplinario debe describir los hechos con precisión y fecha concreta.',
  conciliacion_previa:     'La conciliación previa es obligatoria antes de la demanda laboral. Suspende los plazos de prescripción.',
  recurso_suplicacion:     'Solo cabe por motivos tasados. Verifique que la cuantía o materia lo permiten (art. 191 LRJS).',
  contrato_compraventa:    'Especifique el saneamiento por vicios ocultos. Si es inmueble, considere inscripción en el Registro.',
  nda:                     'Defina con precisión qué información es confidencial. Un NDA demasiado amplio es difícil de ejecutar.',
  contrato_servicios:      'Especifique entregables, plazos y condiciones de pago. La cláusula de PI es clave en tecnología.',
  pacto_socios:            'Acuerdo privado no inscribible. Complemente con los Estatutos Sociales para mayor seguridad.',
  reclamacion_aseguradora: 'Adjunte la póliza, el parte del siniestro y la denegación de la aseguradora. Plazo: 2 años.',
  recurso_alzada:          'Plazo: 1 mes desde la notificación del acto impugnado. No interrumpe la ejecutividad del acto.',
  recurso_contencioso:     'Plazo: 2 meses desde la notificación. No hay suspensión automática del acto impugnado.',
  solicitud_administrativa:'La Administración tiene 3 meses para resolver. Guarde el acuse de recibo de la presentación.',
  reclamacion_patrimonial: 'Prescribe al año del daño. Acredite la antijuridicidad del daño y el nexo causal.',
  denuncia_administrativa: 'El denunciante no se convierte automáticamente en parte del procedimiento sancionador.',
  denuncia_penal:          'Puede presentarse ante Policía, Guardia Civil o directamente al Juzgado. Incluya toda la prueba.',
  querella:                'Requiere procurador y abogado. El querellante se convierte en acusación particular.',
  escrito_defensa:         'Proponga toda la prueba aquí — la no propuesta puede no admitirse posteriormente.',
  recurso_reforma:         'Se interpone ante el mismo órgano que dictó el auto. Plazo: 3 días desde la notificación.',
  solicitud_indulto:       'El informe del tribunal sentenciador y el historial penitenciario son determinantes.',
};

// ── Helpers ──────────────────────────────────────────────────────

function buildPrompt(
  docLabel: string,
  area: string,
  parties: Party[],
  facts: string,
  keyDates: KeyDate[],
  jurisdiction: string,
  specificFields: Record<string, string>,
  docTypeValue: string,
  refDocText: string,
): string {
  const lines: string[] = [
    `Genera un documento legal profesional completo: **${docLabel}** — Área: ${area}\n`,
    '## PARTES INVOLUCRADAS',
  ];
  parties.filter(p => p.name.trim()).forEach(p => {
    lines.push(`- ${p.role || 'Parte'}: ${p.name.trim()}${p.nif.trim() ? ` (NIF/CIF: ${p.nif.trim()})` : ''}`);
  });
  if (facts.trim()) { lines.push('\n## HECHOS Y DESCRIPCIÓN', facts.trim()); }
  const filledDates = keyDates.filter(d => d.date);
  if (filledDates.length) {
    lines.push('\n## FECHAS RELEVANTES');
    filledDates.forEach(d => lines.push(`- ${d.label || 'Fecha'}: ${d.date}`));
  }
  if (jurisdiction.trim()) { lines.push('\n## JURISDICCIÓN / TRIBUNAL', jurisdiction.trim()); }
  const sfFields = SPECIFIC_FIELDS[docTypeValue] ?? [];
  const filledSF  = sfFields.filter(f => specificFields[f.key]?.trim());
  if (filledSF.length) {
    lines.push('\n## DATOS ESPECÍFICOS');
    filledSF.forEach(f => lines.push(`- ${f.label}: ${specificFields[f.key]}`));
  }
  if (refDocText.trim()) {
    lines.push('\n## DOCUMENTO DE REFERENCIA (extracto)');
    lines.push(refDocText.slice(0, 3000));
  }
  lines.push(
    '\n## INSTRUCCIONES DE FORMATO',
    '- Genera el documento legal COMPLETO con todos sus apartados formales.',
    '- Formato Markdown: # título principal, ## secciones, **negrita** para datos clave.',
    '- Lenguaje jurídico formal y preciso. Cita artículos y leyes aplicables del ordenamiento jurídico español.',
    '- Incluye: encabezado, identificación de partes, hechos, fundamentos de derecho, petición y otrosí/firma.',
  );
  return lines.join('\n');
}

function getValidation(parties: Party[], facts: string, specificFields: Record<string, string>, docTypeValue: string) {
  const hasParty = parties.some(p => p.name.trim());
  const hasFacts = facts.trim().length >= 30;
  if (!hasParty || !hasFacts) return { status: 'incomplete' as const, label: 'Mínimos sin completar', msg: 'Añade al menos una parte y una descripción de los hechos.' };
  const sfFields = SPECIFIC_FIELDS[docTypeValue] ?? [];
  const filled   = sfFields.filter(f => specificFields[f.key]?.trim()).length;
  if (filled >= Math.min(2, sfFields.length)) return { status: 'complete' as const, label: 'Información completa', msg: 'El documento se generará con buena precisión.' };
  return { status: 'partial' as const, label: 'Mejorable', msg: 'Completar los campos específicos mejorará el resultado.' };
}

async function extractRefDocText(file: File): Promise<string> {
  const nameLc = file.name.toLowerCase();
  if (nameLc.endsWith('.txt') || nameLc.endsWith('.md') || file.type.startsWith('text/')) return file.text();
  if (nameLc.endsWith('.pdf') || file.type === 'application/pdf') {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc)
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.296/legacy/build/pdf.worker.mjs';
    const pdf  = await pdfjsLib.getDocument({ data: await file.arrayBuffer(), verbosity: 0 }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      text += (await page.getTextContent()).items.map((it: { str: string }) => it.str).join(' ') + '\n';
    }
    return text;
  }
  if (nameLc.endsWith('.docx')) {
    const raw = Buffer.from(await file.arrayBuffer()).toString('latin1');
    return (raw.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) ?? []).map(m => m.replace(/<[^>]+>/g, '')).join(' ').replace(/\s+/g, ' ').trim();
  }
  return '';
}

// ── Constants ────────────────────────────────────────────────────

const INPUT = 'w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-3 py-2 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40';
const ROLES = ['Demandante','Demandado','Actor','Parte actora','Parte demandada','Empleador','Trabajador','Comprador','Vendedor','Arrendador','Arrendatario','Denunciante','Denunciado','Acusado','Defensa','Solicitante','Interesado','Otro'];

// ── Component ────────────────────────────────────────────────────

export default function GeneracionPage() {
  const { user, userDoc } = useAppAuth();

  // Step machine
  const [step,       setStep]       = useState<'select' | 'form' | 'result'>('select');
  const [activeArea, setActiveArea] = useState<Area>('Civil');
  const [selectedType, setSelectedType] = useState<DocType | null>(null);
  const [customType,   setCustomType]   = useState('');

  // Generic form
  const [parties,    setParties]    = useState<Party[]>([{ id: 1, name: '', role: 'Demandante', nif: '' }, { id: 2, name: '', role: 'Demandado', nif: '' }]);
  const [facts,      setFacts]      = useState('');
  const [keyDates,   setKeyDates]   = useState<KeyDate[]>([{ id: 1, label: '', date: '' }]);
  const [jurisdiction, setJurisdiction] = useState('');
  const [specificFields, setSpecificFields] = useState<Record<string, string>>({});

  // Ref doc
  const refFileRef = useRef<HTMLInputElement>(null);
  const [refDocName,    setRefDocName]    = useState('');
  const [refDocText,    setRefDocText]    = useState('');
  const [loadingRefDoc, setLoadingRefDoc] = useState(false);

  // Doc picker (Mis documentos)
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [pickerDocs,    setPickerDocs]    = useState<DocumentRecord[]>([]);
  const [loadingPicker, setLoadingPicker] = useState(false);
  const [pickerSearch,  setPickerSearch]  = useState('');

  // Generation & result
  const [generating, setGenerating] = useState(false);
  const [result,     setResult]     = useState('');
  const [error,      setError]      = useState('');
  const [autoSaved,  setAutoSaved]  = useState(false);

  // ── Handlers ──────────────────────────────────────────────────

  const selectType = (dt: DocType | null) => {
    setSelectedType(dt);
    setSpecificFields({});
    setStep('form');
  };

  const selectOtro = () => {
    setSelectedType({ value: 'otro', label: 'Otro tipo de documento', area: activeArea });
    setStep('form');
  };

  const handleRefFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingRefDoc(true);
    setRefDocName(file.name);
    try { setRefDocText(await extractRefDocText(file)); }
    catch { setRefDocText(''); }
    setLoadingRefDoc(false);
    if (refFileRef.current) refFileRef.current.value = '';
  }, []);

  const openDocPicker = async () => {
    setShowDocPicker(true);
    if (pickerDocs.length) return;
    setLoadingPicker(true);
    try { setPickerDocs(await getUserDocuments(userDoc.uid)); } catch { /* ignore */ }
    setLoadingPicker(false);
  };

  const handlePickDoc = async (doc: DocumentRecord) => {
    setShowDocPicker(false);
    setLoadingRefDoc(true);
    setRefDocName(doc.name);
    try {
      const res  = await fetch(doc.downloadUrl);
      const blob = await res.blob();
      setRefDocText(await extractRefDocText(new File([blob], doc.name, { type: blob.type })));
    } catch { setRefDocText(''); }
    setLoadingRefDoc(false);
  };

  const handleGenerate = async () => {
    if (!selectedType) return;
    const docLabel = selectedType.value === 'otro' ? (customType || 'Documento legal') : selectedType.label;
    setError('');
    setGenerating(true);
    setResult('');
    setAutoSaved(false);
    setStep('result');

    const idToken = await user.getIdToken();
    const credit  = await consumirCredito(idToken, 'Generación de escritos');
    if (!credit.ok) {
      setError('Créditos insuficientes. Recarga tu saldo desde la página de Herramientas.');
      setGenerating(false);
      setStep('form');
      return;
    }

    const prompt = buildPrompt(docLabel, selectedType.area, parties, facts, keyDates, jurisdiction, specificFields, selectedType.value, refDocText);

    let accumulated = '';
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, history: [], userPlan: userDoc.plan, caseContext: null }),
      });
      const reader  = res.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setResult(accumulated);
        }
      }
      // Auto-save
      if (accumulated.trim()) {
        saveAnalysisDocument({
          content: accumulated,
          title:   `${docLabel} — ${new Date().toLocaleDateString('es-ES')}`,
          userId:  userDoc.uid,
          plan:    userDoc.plan ?? 'Abogados',
          caseId:  null,
        }).then(() => setAutoSaved(true)).catch(() => {});
      }
    } catch {
      setError('Error al generar el documento. Intenta de nuevo.');
    } finally {
      setGenerating(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────

  const docLabel = selectedType
    ? (selectedType.value === 'otro' ? (customType || 'Otro tipo de documento') : selectedType.label)
    : '';
  const validation = selectedType
    ? getValidation(parties, facts, specificFields, selectedType.value)
    : null;
  const sfFields   = selectedType ? (SPECIFIC_FIELDS[selectedType.value] ?? []) : [];
  const tip        = selectedType ? VALIDATION_TIPS[selectedType.value] : null;
  const filteredPickerDocs = pickerDocs.filter(d => !pickerSearch || d.name.toLowerCase().includes(pickerSearch.toLowerCase()));

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        title="Generación de Escritos"
        actions={
          <div className="flex items-center gap-2">
            {step !== 'select' && (
              <Button variant="BtnGhost" size="sm" onClick={() => setStep(step === 'result' ? 'form' : 'select')}>
                ← {step === 'result' ? 'Editar formulario' : 'Cambiar tipo'}
              </Button>
            )}
            <Link href="/tools"><Button variant="BtnGhost" size="sm">Herramientas</Button></Link>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-5">

          {/* ── STEP 1: TYPE SELECTION ──────────────────────── */}
          {step === 'select' && (
            <div className="space-y-4">
              {/* Area tabs */}
              <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl overflow-hidden">
                <div className="flex border-b border-[#2e2b20] overflow-x-auto">
                  {AREAS.map(area => (
                    <button
                      key={area}
                      onClick={() => setActiveArea(area)}
                      className={`flex-1 min-w-[100px] px-4 py-3 text-[12px] font-sans font-semibold whitespace-nowrap transition-colors ${
                        activeArea === area
                          ? 'text-avocat-gold border-b-2 border-avocat-gold bg-avocat-gold/5'
                          : 'text-[#6b6050] hover:text-[#c8c0ac] hover:bg-[#252218]'
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>

                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DOC_TYPES_BY_AREA[activeArea].map(dt => (
                    <button
                      key={dt.value}
                      onClick={() => selectType(dt)}
                      className="text-left px-4 py-3 rounded-lg bg-[#161410] border border-[#2e2b20] hover:border-avocat-gold/40 hover:bg-avocat-gold/5 transition-colors group"
                    >
                      <p className="text-[13px] font-sans font-medium text-[#c8c0ac] group-hover:text-[#e8d4a0] leading-snug">{dt.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Otro tipo */}
              <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-4">
                <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-3">Otro tipo de documento</p>
                <div className="flex gap-2">
                  <input
                    className={`${INPUT} flex-1`}
                    placeholder="Describe el tipo de documento que necesitas..."
                    value={customType}
                    onChange={e => setCustomType(e.target.value)}
                  />
                  <Button variant="BtnGold" size="sm" onClick={selectOtro} disabled={!customType.trim()}>
                    Continuar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: FORM ──────────────────────────────── */}
          {step === 'form' && selectedType && (
            <div className="space-y-4">
              {/* Type header */}
              <div className="bg-avocat-gold/10 border border-avocat-gold/20 rounded-xl px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-[#6b6050]">{selectedType.area}</p>
                  <p className="text-[14px] font-sans font-semibold text-[#e8d4a0]">{docLabel}</p>
                </div>
                <button onClick={() => setStep('select')} className="text-[11px] text-[#6b6050] hover:text-avocat-gold transition-colors">← Cambiar</button>
              </div>

              {/* Parties */}
              <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050]">Partes involucradas</p>
                  <button
                    onClick={() => setParties(prev => [...prev, { id: Date.now(), name: '', role: 'Otro', nif: '' }])}
                    className="text-[11px] text-[#6b6050] hover:text-avocat-gold transition-colors"
                  >
                    + Añadir parte
                  </button>
                </div>
                {parties.map((p, i) => (
                  <div key={p.id} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-5">
                      <input className={INPUT} placeholder="Nombre completo o razón social" value={p.name} onChange={e => setParties(prev => prev.map(x => x.id === p.id ? { ...x, name: e.target.value } : x))} />
                    </div>
                    <div className="col-span-4">
                      <select className={INPUT} value={p.role} onChange={e => setParties(prev => prev.map(x => x.id === p.id ? { ...x, role: e.target.value } : x))}>
                        {ROLES.map(r => <option key={r} value={r} className="bg-[#161410]">{r}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input className={INPUT} placeholder="NIF/CIF" value={p.nif} onChange={e => setParties(prev => prev.map(x => x.id === p.id ? { ...x, nif: e.target.value } : x))} />
                    </div>
                    <div className="col-span-1 flex justify-center pt-2">
                      {parties.length > 1 && (
                        <button onClick={() => setParties(prev => prev.filter(x => x.id !== p.id))} className="text-[#3a3630] hover:text-red-400 transition-colors text-[13px]">×</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Facts */}
              <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5 space-y-3">
                <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050]">Hechos y descripción *</p>
                <textarea rows={5} className={`${INPUT} resize-none leading-relaxed`} placeholder="Describe los hechos relevantes, la situación y las pretensiones. Cuanto más detallado, mejor será el documento generado." value={facts} onChange={e => setFacts(e.target.value)} />
              </div>

              {/* Key dates */}
              <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050]">Fechas relevantes</p>
                  <button onClick={() => setKeyDates(prev => [...prev, { id: Date.now(), label: '', date: '' }])} className="text-[11px] text-[#6b6050] hover:text-avocat-gold transition-colors">+ Añadir fecha</button>
                </div>
                {keyDates.map(d => (
                  <div key={d.id} className="flex gap-2 items-center">
                    <input className={`${INPUT} flex-1`} placeholder="Descripción (ej: Fecha del contrato)" value={d.label} onChange={e => setKeyDates(prev => prev.map(x => x.id === d.id ? { ...x, label: e.target.value } : x))} />
                    <input type="date" className={`${INPUT} w-40`} value={d.date} onChange={e => setKeyDates(prev => prev.map(x => x.id === d.id ? { ...x, date: e.target.value } : x))} />
                    {keyDates.length > 1 && <button onClick={() => setKeyDates(prev => prev.filter(x => x.id !== d.id))} className="text-[#3a3630] hover:text-red-400 transition-colors text-[13px] flex-shrink-0">×</button>}
                  </div>
                ))}
              </div>

              {/* Jurisdiction */}
              <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5 space-y-2">
                <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050]">Jurisdicción / tribunal</p>
                <input className={INPUT} placeholder="Juzgado de Primera Instancia nº X de Madrid / Tribunal Supremo..." value={jurisdiction} onChange={e => setJurisdiction(e.target.value)} />
              </div>

              {/* Specific fields */}
              {sfFields.length > 0 && (
                <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5 space-y-3">
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050]">Datos específicos — {docLabel}</p>
                  {sfFields.map(f => (
                    <div key={f.key}>
                      <label className="block text-[11px] text-[#6b6050] mb-1">{f.label}</label>
                      {f.type === 'select' ? (
                        <select className={INPUT} value={specificFields[f.key] ?? ''} onChange={e => setSpecificFields(prev => ({ ...prev, [f.key]: e.target.value }))}>
                          <option value="" className="bg-[#161410]">— Seleccionar —</option>
                          {f.options!.map(o => <option key={o} value={o} className="bg-[#161410]">{o}</option>)}
                        </select>
                      ) : f.type === 'textarea' ? (
                        <textarea rows={3} className={`${INPUT} resize-none`} placeholder={f.placeholder} value={specificFields[f.key] ?? ''} onChange={e => setSpecificFields(prev => ({ ...prev, [f.key]: e.target.value }))} />
                      ) : (
                        <input type={f.type} className={INPUT} placeholder={f.placeholder} value={specificFields[f.key] ?? ''} onChange={e => setSpecificFields(prev => ({ ...prev, [f.key]: e.target.value }))} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Reference doc */}
              <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050]">Documento de referencia <span className="normal-case font-normal">(opcional)</span></p>
                  <button onClick={openDocPicker} className="text-[11px] text-[#6b6050] hover:text-avocat-gold transition-colors">Mis documentos</button>
                </div>
                <input ref={refFileRef} type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={handleRefFileChange} />
                {refDocName ? (
                  <div className="flex items-center justify-between gap-3 bg-[#161410] border border-[#2e2b20] rounded-lg px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {loadingRefDoc
                        ? <div className="h-3.5 w-3.5 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin flex-shrink-0" />
                        : <span className="text-emerald-400 text-[11px] flex-shrink-0">✓</span>
                      }
                      <span className="text-[12px] text-[#c8c0ac] truncate">{refDocName}</span>
                    </div>
                    <button onClick={() => { setRefDocName(''); setRefDocText(''); }} className="text-[11px] text-[#3a3630] hover:text-red-400 transition-colors flex-shrink-0">Quitar</button>
                  </div>
                ) : (
                  <button onClick={() => refFileRef.current?.click()} className="w-full border border-dashed border-[#2e2b20] rounded-lg py-4 text-center text-[12px] text-[#3a3630] hover:border-avocat-gold/30 hover:text-[#6b6050] transition-colors">
                    Subir PDF, DOCX o TXT como referencia
                  </button>
                )}
              </div>

              {/* Validation card */}
              {validation && (
                <div className={`rounded-xl border p-5 space-y-3 ${
                  validation.status === 'complete'   ? 'bg-emerald-500/5 border-emerald-500/20' :
                  validation.status === 'partial'    ? 'bg-amber-500/5 border-amber-500/20' :
                                                       'bg-[#1e1c16] border-[#2e2b20]'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px]">
                      {validation.status === 'complete' ? '✅' : validation.status === 'partial' ? '⚠️' : '🔴'}
                    </span>
                    <span className={`text-[12px] font-sans font-semibold ${
                      validation.status === 'complete' ? 'text-emerald-400' :
                      validation.status === 'partial'  ? 'text-amber-400' : 'text-[#6b6050]'
                    }`}>{validation.label}</span>
                    <span className="text-[12px] text-[#6b6050]">— {validation.msg}</span>
                  </div>
                  {tip && <p className="text-[11px] text-[#6b6050] leading-relaxed border-t border-[#2e2b20] pt-3">{tip}</p>}
                  {error && <p className="text-[12px] text-red-400">{error}</p>}
                  <div className="flex justify-end">
                    <Button
                      variant="BtnGold"
                      size="md"
                      loading={generating}
                      disabled={validation.status === 'incomplete'}
                      onClick={handleGenerate}
                    >
                      Generar documento
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: RESULT ────────────────────────────── */}
          {step === 'result' && (
            <div className="space-y-4">
              {/* Status bar */}
              <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl px-5 py-3 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-[10px] font-sans font-semibold uppercase tracking-widest text-[#6b6050]">{selectedType?.area}</p>
                  <p className="text-[13px] font-sans font-semibold text-[#e8d4a0]">{docLabel}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {autoSaved && (
                    <Link href="/documents" className="text-[12px] text-emerald-400 hover:underline">Guardado en Mis Documentos →</Link>
                  )}
                  {result && !generating && (
                    <>
                      <Button variant="BtnGhost" size="sm" onClick={() => navigator.clipboard.writeText(result)}>Copiar</Button>
                      <Button variant="BtnOutlineDark" size="sm" onClick={() => downloadAsWord(result, docLabel)}>Word</Button>
                      <Button variant="BtnOutlineDark" size="sm" onClick={() => downloadAsPdf(result, docLabel)}>PDF</Button>
                    </>
                  )}
                </div>
              </div>

              {/* Streaming result */}
              <div className="bg-[#1e1c16] border border-[#2e2b20] rounded-xl overflow-hidden">
                {generating && !result && (
                  <div className="px-5 py-12 flex flex-col items-center gap-3">
                    <div className="h-6 w-6 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin" />
                    <p className="text-[12px] text-[#6b6050]">Generando {docLabel}…</p>
                  </div>
                )}
                {result && (
                  <pre className="px-5 py-5 text-[12px] font-sans text-[#c8c0ac] whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[600px] overflow-y-auto">
                    {result}
                    {generating && <span className="inline-block w-1 h-3 bg-avocat-gold animate-pulse ml-0.5 align-middle" />}
                  </pre>
                )}
                {error && <p className="px-5 py-4 text-[12px] text-red-400">{error}</p>}
              </div>

              {/* Post-generation actions */}
              {!generating && result && (
                <div className="flex gap-3 justify-end">
                  <Button variant="BtnGhost" size="sm" onClick={() => { setResult(''); setError(''); setAutoSaved(false); setStep('form'); }}>
                    Regenerar con cambios
                  </Button>
                  <Link href="/documents">
                    <Button variant="BtnGold" size="sm">Ver en Mis Documentos →</Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Mis Documentos picker modal ──────────────────── */}
      {showDocPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDocPicker(false)} />
          <div className="relative bg-[#1e1c16] border border-[#2e2b20] rounded-2xl p-5 w-full max-w-md shadow-xl space-y-3">
            <h2 className="font-sans font-semibold text-[14px] text-[#e8d4a0]">Mis documentos</h2>
            <input className={INPUT} placeholder="Buscar..." value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} />
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {loadingPicker && <div className="py-6 flex justify-center"><div className="h-5 w-5 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin" /></div>}
              {!loadingPicker && filteredPickerDocs.length === 0 && <p className="text-[12px] text-[#3a3630] py-6 text-center">Sin documentos guardados.</p>}
              {filteredPickerDocs.map(d => (
                <button key={d.id} onClick={() => handlePickDoc(d)} className="w-full text-left px-3 py-2.5 rounded-lg bg-[#161410] border border-[#2e2b20] hover:border-avocat-gold/30 transition-colors">
                  <p className="text-[12px] font-medium text-[#c8c0ac] truncate">{d.name}</p>
                  <p className="text-[10px] text-[#3a3630] uppercase mt-0.5">{d.type}</p>
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-1">
              <Button variant="BtnGhost" size="sm" onClick={() => setShowDocPicker(false)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
