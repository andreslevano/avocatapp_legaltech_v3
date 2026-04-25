'use client';

type Plan = 'Abogados' | 'Estudiantes' | 'Autoservicio';

interface PlanCardsProps {
  selected: Plan | '';
  onChange: (plan: Plan) => void;
}

const PLANS: { id: Plan; emoji: string; name: string; price: string; unit: string; description: string }[] = [
  {
    id: 'Abogados',
    emoji: '⚖️',
    name: 'Abogado',
    price: '€75',
    unit: '/mes',
    description: 'Dashboard, agente IA con contexto de casos, escritos oficiales.',
  },
  {
    id: 'Estudiantes',
    emoji: '📚',
    name: 'Estudiante',
    price: '€3',
    unit: '/escrito',
    description: 'Tutor socrático que guía sin dar la respuesta directa.',
  },
  {
    id: 'Autoservicio',
    emoji: '🧑‍💼',
    name: 'Particular',
    price: '€50',
    unit: '/mes',
    description: 'Asistente legal en lenguaje llano, sin tecnicismos.',
  },
];

export default function PlanCards({ selected, onChange }: PlanCardsProps) {
  return (
    <div className="space-y-3">
      <p className="text-small font-medium text-avocat-gray5 mb-2">Selecciona tu plan *</p>
      {PLANS.map((plan) => {
        const isSelected = selected === plan.id;
        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => onChange(plan.id)}
            className={[
              'w-full text-left px-4 py-3 rounded-lg border transition-all duration-150',
              isSelected
                ? 'border-avocat-gold bg-avocat-gold-bg shadow-gold ring-1 ring-avocat-gold'
                : 'border-avocat-border bg-white hover:border-avocat-gold-l',
            ].join(' ')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{plan.emoji}</span>
                <div>
                  <p className="text-small font-semibold text-avocat-black">{plan.name}</p>
                  <p className="text-[12px] text-avocat-gray5">{plan.description}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <span className="font-display font-semibold text-[20px] text-avocat-black">{plan.price}</span>
                <span className="text-[11px] text-avocat-gray9">{plan.unit}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export type { Plan };
