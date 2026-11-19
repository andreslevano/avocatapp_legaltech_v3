// Generación de escritos — the catalog of document types by area. Client-safe.
// Used by /tools/generacion and by the Favoritos section of /tools (users/{uid}.favoriteEscritos).

export const AREAS = ['Civil', 'Laboral', 'Mercantil', 'Administrativo', 'Penal'] as const;
export type Area = (typeof AREAS)[number];
export interface DocType { value: string; label: string; area: Area }

export const DOC_TYPES_BY_AREA: Record<Area, DocType[]> = {
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

export const ALL_DOC_TYPES: DocType[] = Object.values(DOC_TYPES_BY_AREA).flat();

export const escritoByValue = (value: string) => ALL_DOC_TYPES.find(t => t.value === value) ?? null;
