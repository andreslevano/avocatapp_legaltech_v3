'use client';

// /tools/nda for MOBIFORWORK users: the NDA is the lawyer-validated template (verbatim). Only the
// Parte Receptora (Opción A persona física / Opción B sociedad) and the Productos Protegidos are
// entered; everything else is fixed by the template and shown as a summary.

import type { ClientDoc } from '@/lib/firestore';
import { MFW_NDA_TEMPLATE, type MfwReceptor } from '@/lib/org-templates/mobiforwork-nda';

const INPUT = 'bg-[#161410] border border-[#2e2b20] rounded-lg px-3 py-2.5 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40';
const LABEL = 'block text-[11px] font-sans font-semibold uppercase tracking-widest text-[#6b6050] mb-1.5';

interface Props {
  receptor: MfwReceptor;
  onReceptor: (r: MfwReceptor) => void;
  productos: string;
  onProductos: (s: string) => void;
  clients: ClientDoc[];
  selectedClientId: string;
  onClient: (id: string) => void;
}

export default function MfwNdaFields({ receptor: r, onReceptor, productos, onProductos, clients, selectedClientId, onClient }: Props) {
  const set = (p: Partial<MfwReceptor>) => onReceptor({ ...r, ...p });
  const company = r.tipo === 'sociedad';
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-avocat-gold/30 bg-avocat-gold/5 px-4 py-3 space-y-1">
        <p className="text-[12px] font-sans font-semibold text-avocat-gold">Plantilla validada por abogado · {MFW_NDA_TEMPLATE.company}</p>
        <p className="text-[12px] text-[#c8c0ac] leading-relaxed">
          El NDA se genera con el texto aprobado, sin cambios en sus cláusulas. Solo completas los datos de la Parte Receptora y los Productos Protegidos.
        </p>
        <p className="text-[11px] text-[#6b6050]">
          Fijado por la plantilla: Parte Divulgadora MOBIFORWORK S.L. (CIF {MFW_NDA_TEMPLATE.cif}, Félix Dia Morales, CEO) · protección recíproca ·
          vigencia 5 años · confidencialidad 10 años desde cada revelación · cláusula penal 10.000 € · protección reforzada y no elusión ·
          RGPD · Juzgados de Huesca · español.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-sans font-semibold uppercase tracking-widest text-avocat-gold/70">Parte Receptora</p>
          {clients.length > 0 && (
            <select value={selectedClientId} onChange={e => onClient(e.target.value)}
              className="text-[11px] font-sans bg-[#161410] border border-[#2e2b20] text-[#6b6050] px-2.5 py-1 rounded-md focus:outline-none">
              <option value="">Seleccionar cliente…</option>
              {clients.map(c => <option key={c.id} value={c.id} className="bg-[#161410]">{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
            </select>
          )}
        </div>
        <div className="flex gap-2">
          {([['sociedad', 'Opción B · Sociedad'], ['persona', 'Opción A · Persona física']] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => set({ tipo: k })}
              className={`px-3 py-1.5 rounded-lg border text-[12px] transition-colors ${r.tipo === k ? 'border-avocat-gold/60 text-avocat-gold bg-avocat-gold/10' : 'border-[#2e2b20] text-[#6b6050] hover:text-[#c8c0ac]'}`}>
              {label}
            </button>
          ))}
        </div>
        {company && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input className={INPUT} placeholder="Razón social *" value={r.razonSocial ?? ''} onChange={e => set({ razonSocial: e.target.value })} />
            <input className={INPUT} placeholder="NIF de la sociedad" value={r.nif ?? ''} onChange={e => set({ nif: e.target.value })} />
            <input className={INPUT} placeholder="Domicilio social" value={r.domicilio ?? ''} onChange={e => set({ domicilio: e.target.value })} />
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input className={INPUT} placeholder={company ? 'Nombre del representante *' : 'Nombre completo *'} value={r.nombre ?? ''} onChange={e => set({ nombre: e.target.value })} />
          <input className={INPUT} placeholder="DNI / NIE / Pasaporte" value={r.documento ?? ''} onChange={e => set({ documento: e.target.value })} />
          {company
            ? <input className={INPUT} placeholder="Cargo del representante" value={r.cargo ?? ''} onChange={e => set({ cargo: e.target.value })} />
            : <input className={INPUT} placeholder="Domicilio" value={r.domicilio ?? ''} onChange={e => set({ domicilio: e.target.value })} />}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input className={INPUT} type="email" placeholder="Email (notificaciones y firma)" value={r.email ?? ''} onChange={e => set({ email: e.target.value })} />
          {company && (
            <input className={`${INPUT} sm:col-span-2`} placeholder="Facultades: escritura de poder o cargo inscrito" value={r.facultades ?? ''} onChange={e => set({ facultades: e.target.value })} />
          )}
        </div>
        <p className="text-[11px] text-[#6b6050]">Los datos que dejes vacíos aparecerán entre corchetes en el documento para completarlos antes de firmar.</p>
      </div>

      <div>
        <label className={LABEL}>Productos Protegidos *</label>
        <textarea rows={4} value={productos} onChange={e => onProductos(e.target.value)}
          placeholder={'Un producto, servicio o material por línea.\nEj: Plataforma Mobility For Work (CMMS) y sus módulos de mantenimiento\nPortal de fabricantes Norte by Mobility For Work'}
          className="w-full bg-[#161410] border border-[#2e2b20] rounded-lg px-4 py-3 text-[13px] font-sans text-[#c8c0ac] placeholder-[#3a3630] focus:outline-none focus:border-avocat-gold/40 resize-none leading-relaxed" />
      </div>
    </div>
  );
}
