const ITEMS = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#B8882A" strokeWidth="1.5" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    label: 'GDPR Compliant',
    sub: 'Privacidad garantizada',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#B8882A" strokeWidth="1.5" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    label: '99.9% Uptime',
    sub: 'Servicio confiable',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#B8882A" strokeWidth="1.5" className="w-5 h-5">
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
      </svg>
    ),
    label: 'Soporte 24/7',
    sub: 'Ayuda cuando la necesites',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#B8882A" strokeWidth="1.5" className="w-5 h-5">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
    label: 'Cifrado bancario',
    sub: 'Nivel enterprise',
  },
];

export default function TrustBand() {
  return (
    <div className="bg-white border-y border-avocat-border/40 py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-around gap-6">
          {ITEMS.map((item, i) => (
            <div key={item.label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-avocat-gold-bg border border-avocat-gold-l/40 flex items-center justify-center flex-shrink-0">
                {item.icon}
              </div>
              <div>
                <p className="font-display text-[14px] font-semibold text-avocat-black leading-tight">{item.label}</p>
                <p className="font-sans text-[11px] text-avocat-gray9">{item.sub}</p>
              </div>
              {i < ITEMS.length - 1 && (
                <div className="hidden sm:block w-px h-8 bg-avocat-border/40 ml-4" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
