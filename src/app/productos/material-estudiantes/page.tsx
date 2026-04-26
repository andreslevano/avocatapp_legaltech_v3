import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';

const AREAS = [
  { name: 'Derecho Constitucional', docs: ['Recurso de amparo', 'Recurso de inconstitucionalidad', 'Acción de protección'] },
  { name: 'Derecho Civil', docs: ['Demanda de reclamación', 'Escrito de oposición', 'Medidas cautelares'] },
  { name: 'Derecho Laboral', docs: ['Demanda por despido', 'Reclamación de salarios', 'Accidente laboral'] },
  { name: 'Derecho Penal', docs: ['Denuncia y querella', 'Escrito de defensa', 'Recurso de apelación'] },
];

const PACKAGE = [
  { title: 'Template DOCX', description: 'Plantilla editable en Word lista para personalizar' },
  { title: 'Template PDF', description: 'Versión PDF de referencia con notas al margen' },
  { title: 'Ejemplo completo', description: 'Documento desarrollado con datos reales de ejemplo' },
  { title: 'Material de estudio', description: 'Guía con explicaciones, fundamentos y claves del texto' },
];

const BENEFITS = [
  'Más de 50 tipos de documentos legales disponibles',
  'Precios accesibles desde €3 por documento',
  'Material de estudio incluido en cada paquete',
  'Descarga inmediata después del pago',
  'Tutor socrático IA disponible con el plan Estudiantes',
];

export default function MaterialEstudiantesPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section
        className="relative min-h-[560px] flex items-center py-24 overflow-hidden"
        style={{ backgroundImage: 'url(/images/hero-estudiantes-background.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-avocat-black/75" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <Tag variant="gold" className="mb-6">Plan Estudiantes — €3/escrito</Tag>
          <h1 className="font-display text-h1 text-avocat-cream mb-6 max-w-3xl mx-auto">
            Material de Estudio Legal
          </h1>
          <p className="font-sans text-body text-avocat-cream/80 max-w-2xl mx-auto mb-10">
            Accede a una biblioteca de plantillas legales profesionales, ejemplos completos y un tutor socrático IA para estudiantes de derecho.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup?plan=Estudiantes">
              <Button variant="BtnGold" size="lg">Explorar material</Button>
            </Link>
            <Link href="/login">
              <Button variant="BtnOutlineDark" size="lg" className="border-avocat-cream/40 text-avocat-cream hover:bg-avocat-cream/10">
                Ya tengo cuenta
              </Button>
            </Link>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-6 max-w-sm mx-auto">
            {[['50+', 'Documentos'], ['10+', 'Áreas legales'], ['€3', 'Desde']].map(([val, lbl]) => (
              <div key={lbl} className="text-center">
                <div className="font-display text-[32px] text-avocat-gold leading-none">{val}</div>
                <div className="font-sans text-small text-avocat-cream/60 mt-1">{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Areas */}
      <section className="py-20 bg-avocat-cream">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-h2 text-avocat-black mb-3">Áreas legales disponibles</h2>
            <p className="font-sans text-body text-avocat-gray5 max-w-xl mx-auto">
              Documentos organizados por área para facilitar tu estudio.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {AREAS.map((a) => (
              <div key={a.name} className="bg-white rounded-xl p-6 border border-avocat-border shadow-card">
                <h3 className="font-sans font-semibold text-[16px] text-avocat-black mb-4">{a.name}</h3>
                <ul className="space-y-2">
                  {a.docs.map((d) => (
                    <li key={d} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-avocat-gold flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-sans text-small text-avocat-gray5">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Package contents */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-h2 text-avocat-black mb-3">¿Qué incluye cada paquete?</h2>
            <p className="font-sans text-body text-avocat-gray5 max-w-xl mx-auto">
              Cada documento viene con 4 archivos para que puedas estudiar y practicar.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {PACKAGE.map((p) => (
              <div key={p.title} className="bg-avocat-cream rounded-xl p-6 border border-avocat-border text-center">
                <div className="w-12 h-12 rounded-xl bg-avocat-gold-bg border border-avocat-gold-l flex items-center justify-center text-avocat-gold mx-auto mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="font-sans font-semibold text-[15px] text-avocat-black mb-2">{p.title}</h3>
                <p className="font-sans text-small text-avocat-gray5">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-avocat-cream">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-display text-h2 text-avocat-black text-center mb-10">Por qué elegir Avocat</h2>
          <div className="space-y-3">
            {BENEFITS.map((b) => (
              <div key={b} className="flex items-start gap-3 bg-white rounded-xl px-5 py-4 border border-avocat-border">
                <svg className="w-5 h-5 text-avocat-gold flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-sans text-small text-avocat-black">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-avocat-black">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="font-display text-h2 text-avocat-cream mb-4">
            Estudia con material profesional real
          </h2>
          <p className="font-sans text-body text-avocat-cream/70 mb-8">
            Más de 50 documentos disponibles. Precios desde €3.
          </p>
          <Link href="/signup?plan=Estudiantes">
            <Button variant="BtnGold" size="lg">Ver catálogo</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
