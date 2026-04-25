import type { UserDoc } from '@/lib/auth';

const SHORTCUTS: Record<string, string[]> = {
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

interface AgentWelcomeProps {
  userDoc: UserDoc;
  onShortcut: (text: string) => void;
}

export default function AgentWelcome({ userDoc, onShortcut }: AgentWelcomeProps) {
  const shortcuts = SHORTCUTS[userDoc.plan ?? 'Autoservicio'] ?? SHORTCUTS.Autoservicio;
  const firstName = (userDoc.displayName ?? '').split(' ')[0] || 'allí';

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
      <p className="text-[13px] text-[#6b6050] mb-8 text-center max-w-xs">
        Soy tu asistente legal. ¿En qué puedo ayudarte hoy?
      </p>

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
