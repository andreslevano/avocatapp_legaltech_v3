// Mock STRICT del modelo para Reclamación de Cantidad (España)
// Devuelve un MODEL_OUTPUT coherente con LEC/CC y variantes pro se.

export type ModelOutput = {
  version: "1.0";
  jurisdiccion: "ES";
  cauceRecomendado: "monitorio" | "verbal";
  competencia: { fuero: string; referencias: string[] };
  encabezado: string;
  partes: string;
  hechos: string[];
  fundamentos: {
    competencia: string[];
    legitimacion: string[];
    fondo: string[];
    interesesYCostas: string[];
  };
  suplico: string[];
  otrosi: string[];
  documentos: string[];
  lugarFecha: string;
  notasProSe: string[];
  citas: string[];
};

function toEUR(n: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

export function generateReclamacionCantidadMock(input: any): ModelOutput {
  const cuantia = Number(input?.cuantiaOverride) || 0;
  const plaza = input?.plaza || "Madrid";
  const acreedor = input?.acreedor?.nombre || "[ACREEDOR]";
  const deudor = input?.deudor?.nombre || "[DEUDOR]";
  const docs = Array.isArray(input?.docs) && input.docs.length ? input.docs : [
    "DOC-1: Factura",
    "DOC-2: Albarán",
    "DOC-3: Requerimiento fehaciente"
  ];

  // Heurística de cauce:
  const hasDocs = (input?.ocr?.files || []).some((f: any) => (f?.docType === "factura" || f?.docType === "albaran"));
  let cauce: "monitorio" | "verbal" = "verbal";
  if (input?.viaPreferida === "monitorio" && hasDocs) cauce = "monitorio";
  else if (input?.viaPreferida === "verbal") cauce = "verbal";
  else if (hasDocs && cuantia > 0) cauce = "monitorio";

  const proSeNotes: string[] = [];
  if (cauce === "monitorio") {
    proSeNotes.push(
      "La petición inicial del procedimiento monitorio puede presentarse sin abogado ni procurador (art. 814.2 LEC).",
      "Acompañe originales o copias de documentos que acrediten la deuda (art. 812 LEC)."
    );
  } else if (cauce === "verbal" && cuantia <= 2000) {
    proSeNotes.push(
      "En el juicio verbal de cuantía ≤ 2.000 €, no es preceptiva la intervención de abogado ni procurador (art. 31.2 LEC)."
    );
  }

  const compRefs = ["art. 50 LEC", "art. 51 LEC"];
  const competencia = {
    fuero: "Juzgado de Primera Instancia del domicilio del deudor (regla general).",
    referencias: compRefs
  };

  const encabezado = `AL JUZGADO DE PRIMERA INSTANCIA DE ${plaza.toUpperCase()}`;
  const partes = `${acreedor}, en calidad de parte acreedora, frente a ${deudor}, deudor, en reclamación de cantidad de ${toEUR(cuantia)}.`;

  const hechos = [
    "PRIMERO.— Existencia de relación negocial y devengo de precio.",
    "SEGUNDO.— Emisión de factura(s)/documento(s) acreditativos y vencimiento de la obligación.",
    "TERCERO.— Requerimiento previo de pago sin satisfacción de la deuda.",
  ];

  const fundamentos = {
    competencia: [
      "Competencia territorial conforme a los arts. 50 y 51 LEC.",
      cauce === "monitorio"
        ? "Procede el cauce monitorio por tratarse de deuda dineraria líquida, determinada, vencida y exigible con soporte documental (art. 812 LEC)."
        : "Procede juicio verbal por razón de cuantía/objeto (LEC).",
    ],
    legitimacion: [
      "Legitimación activa del acreedor y pasiva del deudor por su intervención en la relación jurídica obligacional.",
    ],
    fondo: [
      "Responsabilidad contractual por incumplimiento (arts. 1101 y ss. CC).",
      "Exigibilidad de la obligación dineraria por vencimiento.",
    ],
    interesesYCostas: [
      "Intereses de mora del art. 1108 CC, y desde la reclamación judicial conforme al art. 1109 CC.",
      "Condena en costas al vencido (art. 394 LEC).",
    ],
  };

  const suplico = [
    `1) Se dicte resolución estimando la reclamación y condenando a ${deudor} al pago de ${toEUR(cuantia)}.`,
    "2) Se condene al pago de los intereses legales conforme a los arts. 1108 y 1109 CC.",
    "3) Se impongan las costas al demandado conforme al art. 394 LEC.",
  ];

  const otrosi = [
    "PRIMER OTROSÍ DIGO.— Se tienen por aportados los documentos identificados.",
    "SEGUNDO OTROSÍ DIGO.— Se tenga por señalado domicilio a efectos de notificaciones el indicado en el encabezamiento.",
  ];

  const documentos = docs;
  const lugarFecha = `${plaza}, a [FECHA].`;

  const citas = [
    ...(cauce === "monitorio" ? ["art. 812 LEC", "art. 813 LEC", "art. 814.2 LEC"] : ["art. 31.2 LEC"]),
    ...compRefs,
    "art. 394 LEC",
    "arts. 1108-1109 CC"
  ];

  const model: ModelOutput = {
    version: "1.0",
    jurisdiccion: "ES",
    cauceRecomendado: cauce,
    competencia,
    encabezado,
    partes,
    hechos,
    fundamentos,
    suplico,
    otrosi,
    documentos,
    lugarFecha,
    notasProSe: proSeNotes,
    citas
  };

  return model;
}
