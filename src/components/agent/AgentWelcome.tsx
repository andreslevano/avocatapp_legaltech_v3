import type { UserDoc } from '@/lib/auth';

export interface CaseContext {
  id?: string;
  title?: string;
  type?: string;
  client?: string;
  notes?: string;
}

const GENERIC_SHORTCUTS: Record<string, string[]> = {
  Abogados: [
    'Redacta una demanda de juicio ordinario',
    'Analiza la jurisprudencia del TS sobre cláusulas abusivas',
    'Resume los hechos de mi caso',
    'Genera el contrato de arrendamiento',
  ],
  Estudiantes: [
    '¿Qué es la responsabilidad extracontractual?',
    'Explícame el principio de legalidad',
    'Analiza este caso práctico conmigo',
    '¿Cuáles son los elementos del delito?',
  ],
  Autoservicio: [
    '¿Puedo reclamar a mi casero?',
    'Me despidieron sin causa, ¿qué hago?',
    '¿Cómo redacto un burofax?',
    '¿Cuánto tiempo tengo para reclamar?',
  ],
};

const CASE_TYPE_SHORTCUTS: Record<string, (client: string) => string[]> = {
  contractual: (client) => [
    `Redacta un escrito de resolución por incumplimiento contractual${client ? ` en el caso de ${client}` : ''}`,
    'Analiza las cláusulas del contrato e identifica las que son abusivas o nulas',
    `Genera carta de requerimiento extrajudicial dirigida a ${client || 'la contraparte'}`,
    'Evalúa la viabilidad de una mediación frente al proceso judicial',
  ],
  civil: (client) => [
    `Redacta la demanda de juicio ordinario civil${client ? ` para ${client}` : ''}`,
    'Resume los hechos del caso para la vista oral',
    'Analiza la jurisprudencia del TS aplicable a este asunto',
    'Genera el escrito de reclamación extrajudicial previa',
  ],
  laboral: (client) => [
    `Redacta la demanda de despido improcedente${client ? ` de ${client}` : ''}`,
    'Calcula la indemnización máxima aplicable según el ET',
    'Prepara carta de reclamación de cantidades adeudadas',
    'Analiza el expediente disciplinario y su validez legal',
  ],
  familia: (client) => [
    `Redacta el convenio regulador de divorcio${client ? ` para ${client}` : ''}`,
    'Elabora escrito sobre custodia y régimen de visitas',
    'Calcula la pensión de alimentos aplicando jurisprudencia del TS',
    'Genera el escrito de medidas provisionales urgentes',
  ],
  penal: (client) => [
    `Redacta la denuncia o querella${client ? ` en nombre de ${client}` : ''}`,
    'Prepara el escrito de defensa para el juicio oral',
    'Analiza los elementos del delito y su aplicación a los hechos',
    'Genera recurso de apelación contra el auto de sobreseimiento',
  ],
  sucesoral: (client) => [
    `Redacta el cuaderno particional de la herencia${client ? ` de ${client}` : ''}`,
    'Genera la declaración de herederos ab intestato',
    'Elabora el inventario y avalúo de los bienes hereditarios',
    'Analiza la validez del testamento y sus posibles impugnaciones',
  ],
  otro: (client) => [
    `Resume los hechos del caso${client ? ` de ${client}` : ''} y propón la estrategia legal`,
    'Redacta el escrito de demanda o reclamación',
    'Analiza la jurisprudencia aplicable a este asunto',
    'Genera el documento legal principal que necesitas para este caso',
  ],
};

function normalizeCaseType(type?: string): string {
  const t = (type ?? '').toLowerCase();
  if (t.includes('laboral') || t.includes('trabajo')) return 'laboral';
  if (t.includes('mercantil') || t.includes('contractual') || t.includes('contrato') || t.includes('arrendamiento')) return 'contractual';
  if (t.includes('famil') || t.includes('divorcio') || t.includes('custodia')) return 'familia';
  if (t.includes('penal') || t.includes('delito') || t.includes('criminal')) return 'penal';
  if (t.includes('sucesoral') || t.includes('herencia') || t.includes('testamento')) return 'sucesoral';
  if (t.includes('civil')) return 'civil';
  if (['contractual', 'civil', 'laboral', 'familia', 'penal', 'sucesoral', 'otro'].includes(t)) return t;
  return 'otro';
}

interface AgentWelcomeProps {
  userDoc: UserDoc;
  onShortcut: (text: string) => void;
  caseContext?: CaseContext;
}

export default function AgentWelcome({ userDoc, onShortcut, caseContext }: AgentWelcomeProps) {
  const plan = userDoc.plan ?? 'Autoservicio';
  const firstName = (userDoc.displayName ?? '').split(' ')[0] || 'allí';

  const hasCaseContext = plan === 'Abogados' && !!caseContext?.title;
  let shortcuts: string[];

  if (hasCaseContext) {
    const typeKey = normalizeCaseType(caseContext!.type);
    shortcuts = CASE_TYPE_SHORTCUTS[typeKey]?.(caseContext!.client ?? '') ?? CASE_TYPE_SHORTCUTS.otro(caseContext!.client ?? '');
  } else {
    shortcuts = GENERIC_SHORTCUTS[plan] ?? GENERIC_SHORTCUTS.Autoservicio;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-12 h-12 rounded-2xl bg-avocat-gold/15 border border-avocat-gold/30 flex items-center justify-center mb-6">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="w-6 h-6 text-avocat-gold"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
          />
        </svg>
      </div>

      <h2 className="font-display text-[22px] text-[#e8d4a0] mb-2">Hola, {firstName}</h2>

      {hasCaseContext ? (
        <div className="mb-8 text-center">
          <p className="text-[13px] text-[#c8c0ac] font-medium mb-0.5 truncate max-w-sm">
            {caseContext!.title}
          </p>
          {caseContext!.client && (
            <p className="text-[11px] text-[#6b6050]">Cliente: {caseContext!.client}</p>
          )}
        </div>
      ) : (
        <p className="text-[13px] text-[#6b6050] mb-8 text-center max-w-xs">
          Soy tu asistente legal. ¿En qué puedo ayudarte hoy?
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-md">
        {shortcuts.map((text, i) => (
          <button
            key={i}
            onClick={() => onShortcut(text)}
            className="text-left px-4 py-3 rounded-xl bg-[#1e1c16] border border-[#2e2b20] hover:border-avocat-gold/30 hover:bg-[#252218] transition-colors"
          >
            <span className="text-[12px] font-sans text-[#c8c0ac] leading-snug">{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
