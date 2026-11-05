// MOBIFORWORK S.L. — NDA template validated by its lawyer (source: NDA_MOBIFORWORK_revisado.docx,
// stored in Storage org_templates/mobilityforwork.es/nda/v1/ and described in Firestore
// org_templates/mobilityforwork.es_nda). Pure — unit tested.
//
// Generation for this organisation is DETERMINISTIC: the approved text below is reproduced verbatim
// and only the variable data is filled in (Parte Receptora, Productos Protegidos). No AI rewrites
// any clause. The reviewer's note at the top of the source ("VERSIÓN REVISADA – las modificaciones
// … en color rojo …") is a working note, not part of the agreement, and is not reproduced.
// Signature lines use "Firma y sello: ____" / "Fecha: ____" so DocuSign anchors are placed
// (doc-html.ts); the Anexo I signature lines are deliberately not anchors.

export const MFW_NDA_TEMPLATE = {
  id: 'mobilityforwork.es_nda',
  version: 'v1',
  domain: 'mobilityforwork.es',
  company: 'MOBIFORWORK S.L.',
  cif: 'ESB22430706',
  sourceFile: 'NDA_MOBIFORWORK_revisado.docx',
  // Fixed by the template (used for the contract record and the form's summary).
  termMonths: 60,              // Cláusula 9: vigencia cinco (5) años
  survivalMonths: 60,          // Cláusula 9: obligaciones diez (10) años desde cada revelación (≈ 5 años tras el fin)
  penaltyEuros: 10000,         // Cláusula 6
  court: 'Huesca',             // Cláusula 11
  place: 'Barbastro (Huesca)',
} as const;

export interface MfwReceptor {
  tipo: 'persona' | 'sociedad';
  // Persona física (Opción A) — and the representative for a company (Opción B)
  nombre?: string;
  domicilio?: string;          // A: domicilio · B: domicilio social
  documento?: string;          // DNI / NIE / Pasaporte n.º
  email?: string;
  // Sociedad (Opción B)
  razonSocial?: string;
  nif?: string;
  cargo?: string;
  facultades?: string;         // escritura de poder o cargo inscrito
}

export interface MfwNdaInput {
  receptor: MfwReceptor;
  /** "Productos Protegidos" box: one per line (or a single description). */
  productos: string;
}

/** A filled value, or the template's own bracketed placeholder so a missing datum stays visible. */
const v = (value: string | undefined, placeholder: string) => {
  const t = (value ?? '').replace(/\s+/g, ' ').trim();
  return t ? `**${t.replace(/\*/g, '')}**` : `[${placeholder}]`;
};
const plain = (value: string | undefined, placeholder: string) => {
  const t = (value ?? '').replace(/\s+/g, ' ').trim();
  return t ? t.replace(/\*/g, '') : `[${placeholder}]`;
};

function receptorParagraph(r: MfwReceptor): string {
  if (r.tipo === 'sociedad') {
    return `De otra parte, ${v(r.razonSocial, 'RAZÓN SOCIAL DEL RECEPTOR')}, con domicilio social en ${v(r.domicilio, 'DOMICILIO SOCIAL')}, con número de identificación fiscal ${v(r.nif, 'NIF')}, representada en este acto por D./Dña. ${v(r.nombre, 'NOMBRE DEL REPRESENTANTE')}, provisto/a de DNI/NIE/Pasaporte n.º ${v(r.documento, 'DNI / NIE / PASAPORTE')}, en su calidad de ${v(r.cargo, 'CARGO')}, con facultades suficientes para obligarla en virtud de ${v(r.facultades, 'ESCRITURA DE PODER O CARGO INSCRITO')}, y correo electrónico ${v(r.email, 'EMAIL DEL RECEPTOR')} (en adelante, el “Receptor” o la “Parte Receptora”). La sociedad responde del cumplimiento del Acuerdo por sus administradores, empleados y colaboradores.`;
  }
  return `De otra parte, D./Dña. ${v(r.nombre, 'NOMBRE DEL RECEPTOR')}, mayor de edad, con domicilio en ${v(r.domicilio, 'DOMICILIO DEL RECEPTOR')}, provisto/a de DNI/NIE/Pasaporte n.º ${v(r.documento, 'DNI / NIE / PASAPORTE')}, y correo electrónico ${v(r.email, 'EMAIL DEL RECEPTOR')}, actuando en nombre propio (en adelante, el «Receptor» o la «Parte Receptora»).`;
}

function productosBlock(productos: string): string {
  const items = productos.split(/\n+/).map(s => s.replace(/^[-*•►]\s*/, '').trim()).filter(Boolean);
  if (!items.length) return '[DESCRIPCIÓN DE LOS PRODUCTOS PROTEGIDOS]';
  return items.map(i => `- **${i.replace(/\*/g, '')}**`).join('\n');
}

/** The approved agreement with the variable data filled in (markdown for doc-html.ts). */
export function renderMfwNda(input: MfwNdaInput): string {
  const r = input.receptor;
  const company = r.tipo === 'sociedad';
  return `**DOCUMENTO CONFIDENCIAL**
Acuerdo de Confidencialidad y No Divulgación · Ley 1/2019 · Secretos Empresariales · Derecho Español

# ACUERDO DE CONFIDENCIALIDAD Y NO DIVULGACIÓN DE INFORMACIÓN

*Non-Disclosure Agreement (NDA) · Derecho español*

## REUNIDAS

De una parte, MOBIFORWORK S.L., con domicilio social en el P.I. Valle del Cinca, Calle D, n.º 53, 22300 Barbastro (Huesca), con número de identificación fiscal CIF ESB22430706, representada en este acto por D./Dña. Félix Dia Morales, en su calidad de CEO (en adelante, la «Empresa» o la «Parte Divulgadora»).

${receptorParagraph(r)}

Ambas partes se reconocen mutuamente capacidad legal suficiente para suscribir el presente Acuerdo y, a tal efecto,

## EXPONEN

Que MOBIFORWORK S.L. (en adelante, la «Empresa») podrá revelar al Receptor información confidencial para establecer, evaluar o desarrollar una relación o colaboración entre las partes, incluyendo evaluaciones comerciales, demostraciones de producto, pilotos tecnológicos, prestación de servicios, distribución, asesoramiento, relaciones laborales o mercantiles, acuerdos de inversión o cualquier otra forma de cooperación empresarial. Asimismo, durante dicha relación, el Receptor podrá revelar a la Empresa información confidencial propia. Las partes desean regular tanto la protección reforzada de la información de la Empresa como, cuando proceda, la protección recíproca de la información confidencial del Receptor.

A efectos de este Acuerdo, la Empresa tendrá la condición de Parte Divulgadora respecto de la información que revele y el Receptor tendrá la condición de Parte Receptora. Si el Receptor revela información confidencial propia a la Empresa, las posiciones se invertirán exclusivamente respecto de dicha información: el Receptor será la Parte Divulgadora y la Empresa la Parte Receptora, quedando ambas sujetas a las obligaciones correspondientes previstas en este Acuerdo.

Que la información que la Empresa compartirá se refiere, en particular, a los productos, servicios o materiales que se describen en el recuadro siguiente (en adelante, los “Productos Protegidos”):

${productosBlock(input.productos)}

Los Productos Protegidos que se añadan después de la firma se recogen en el Anexo I, al final de este documento.

En virtud de lo anterior, las partes suscriben el presente Acuerdo de Confidencialidad y No Divulgación de Información (en adelante, el «Acuerdo»), con arreglo a las siguientes

## CLÁUSULAS

## CLÁUSULA 1. OBJETO

El presente Acuerdo tiene por objeto establecer las condiciones y obligaciones bajo las cuales cada parte deberá acceder, utilizar, custodiar y proteger la Información Confidencial que reciba de la otra en el marco de cualquier relación o interacción entre ellas. La protección se aplicará de forma recíproca a la Información Confidencial que cualquiera de las partes revele, sin perjuicio de que la información de MOBIFORWORK S.L. y, en particular, los Productos Protegidos identificados en este Acuerdo y en su Anexo I, reciban la protección específica y reforzada prevista en la Cláusula 10.

Los Productos Protegidos que figuran en el expositivo de este Acuerdo, y los que se añadan en el Anexo I, gozarán de la protección específica de la Cláusula 10. De cada uno se protegen, entre otros elementos, su software y código fuente, arquitectura, motores de cálculo y reglas, catálogos y bases de datos, métodos y procesos, diseño de pantallas y flujos, documentación, demostraciones y entornos de prueba, hojas de ruta, precios y condiciones comerciales. Lo que no figure como Producto Protegido seguirá protegido como Información Confidencial conforme a la Cláusula 2.

## CLÁUSULA 2. DEFINICIÓN DE INFORMACIÓN CONFIDENCIAL

A los efectos del presente Acuerdo, se entenderá por «Información Confidencial» toda información, conocimiento o material, cualquiera que sea su naturaleza, formato o soporte (escrito, digital, oral, visual, electrónico o de cualquier otro tipo), que una parte (la «Parte Divulgadora») comunique, facilite o permita conocer a la otra (la «Parte Receptora»), directa o indirectamente, antes o después de la firma, y que se identifique como confidencial o que, por su naturaleza, contenido o circunstancias de la revelación, una persona razonable deba considerar confidencial. Se incluye la existencia y contenido de las negociaciones, reuniones, pruebas y relaciones entre las partes.

La Información Confidencial incluirá igualmente la información de terceros que la Parte Divulgadora esté obligada a mantener reservada y que comunique legítimamente a la Parte Receptora. La información oral, visual o mostrada mediante acceso a sistemas o demostraciones quedará protegida desde su revelación cuando sea razonablemente identificable como confidencial, sin necesidad de marcarla ni de confirmarla posteriormente por escrito. La Parte Divulgadora podrá, no obstante, remitir un resumen o confirmación escrita a efectos probatorios.

Esta Información Confidencial podrá consistir en la siguiente enumeración sin que esta sea limitativa:

- Software, aplicaciones, herramientas internas y desarrollos tecnológicos en cualquier estado.
- Funcionalidades, arquitecturas, procesos, diagramas técnicos y código fuente.
- Documentación técnica, manuales y especificaciones.
- Información comercial, estratégica, financiera y de clientes o proveedores.
- Datos personales de empleados, clientes o terceros vinculados a la Empresa.
- Presentaciones, capturas de pantalla, material audiovisual y prototipos.
- Planes de negocio, proyecciones, estudios de mercado y propuestas comerciales.
- Información revelada verbalmente, siempre que se indique su carácter confidencial en el acto o en los diez (10) días hábiles siguientes.

No tendrá la consideración de Información Confidencial aquella que:

a) Sea o llegue a ser de dominio público por causas ajenas a la Parte Receptora.
b) El Receptor pueda acreditar documentalmente que ya conocía con anterioridad a la firma del Acuerdo.
c) Sea recibida de un tercero que la haya obtenido lícitamente y sin restricción de divulgación.
d) Sea desarrollada de forma independiente por el Receptor sin utilizar la Información Confidencial.
e) Deba ser divulgada por imperativo legal o judicial, previa notificación escrita a la Empresa en la medida legalmente posible.

En caso de divulgación legalmente exigida, la Parte Receptora (i) notificará previamente y sin demora a la Parte Divulgadora, salvo prohibición legal; (ii) y cooperará razonablemente para solicitar medidas de protección o limitar el alcance de la divulgación; y (iii) revelará únicamente la parte estrictamente exigida, haciendo constar su carácter confidencial cuando sea posible.

La Parte Receptora deberá acreditar documentalmente que concurre cualquiera de las excepciones anteriores. No se considerará de dominio público la información que solo sea conocida por un círculo restringido de personas ni aquella cuya combinación, selección u organización no sea pública. La excepción de desarrollo independiente exigirá evidencia contemporánea suficiente y no permitirá utilizar conocimientos o materiales derivados de la Información Confidencial.

## CLÁUSULA 3. OBLIGACIONES DEL RECEPTOR

La Parte Receptora se compromete a:

a) Mantener la Información Confidencial en el más estricto secreto y reserva.
b) No divulgar, comunicar ni compartir dicha información con terceros sin autorización expresa y por escrito de la Empresa.
c) No reproducir, copiar, almacenar ni transmitir la Información Confidencial salvo cuando resulte imprescindible para la finalidad acordada.
d) No utilizar la Información Confidencial en beneficio propio o de terceros, ni para finalidades distintas de las previstas en este Acuerdo.
e) No llevar a cabo ingeniería inversa, descompilación ni análisis técnico no autorizado de los desarrollos o sistemas mostrados.
f) Adoptar medidas de seguridad técnicas y organizativas equivalentes a las aplicadas a su propia información confidencial, y en ningún caso inferiores a las de un profesional diligente.
g) Notificar inmediatamente a la Empresa cualquier acceso no autorizado o filtración de la que tenga conocimiento.

La Parte Receptora, además, se obliga a: (i) limitar el acceso a la Información Confidencial a las personas que necesiten conocerla estrictamente para la finalidad autorizada (principio de necesidad de conocer); (ii) informarles previamente de su carácter confidencial y asegurar que estén vinculadas por obligaciones escritas de confidencialidad al menos equivalentes; (iii) mantener un registro razonable de las personas autorizadas cuando la naturaleza de la información lo justifique; (iv) no cargar, introducir ni facilitar Información Confidencial en herramientas de inteligencia artificial generativa, servicios públicos de IA, plataformas de terceros o sistemas que puedan utilizarla para entrenar modelos, mejorar servicios o ponerla a disposición de terceros, salvo autorización previa, expresa y escrita de la Parte Divulgadora; y (v) no realizar pruebas de rendimiento, benchmarking, análisis competitivo, extracción sistemática, scraping ni publicación de resultados sobre los Productos Protegidos sin autorización escrita.

La Parte Receptora responderá frente a la Parte Divulgadora de cualquier acto u omisión de sus administradores, empleados, colaboradores, asesores, agentes y subcontratistas que accedan a la Información Confidencial, como si se tratase de un incumplimiento propio. Solo podrá facilitarles acceso cuando resulte estrictamente necesario para la finalidad autorizada y siempre que estén sujetos a compromisos de confidencialidad exigibles y equivalentes. La Parte Receptora garantizará el cumplimiento de este Acuerdo por dichas personas.

La Parte Receptora notificará a la Parte Divulgadora cualquier pérdida, acceso, uso o divulgación no autorizados, o cualquier incidente que pueda comprometer la Información Confidencial, inmediatamente y, en todo caso, dentro de las veinticuatro (24) horas siguientes a tener conocimiento. La notificación incluirá la información disponible sobre naturaleza, alcance, datos afectados, consecuencias y medidas adoptadas o propuestas. La Parte Receptora cooperará, asumirá las medidas de contención y no realizará comunicaciones públicas ni a terceros sobre el incidente que identifiquen a la Parte Divulgadora sin su autorización, salvo obligación legal.

## CLÁUSULA 4. PROPIEDAD INTELECTUAL E INDUSTRIAL

Toda la Información Confidencial seguirá siendo titularidad de la Parte Divulgadora o del tercero que ostente legítimamente los derechos sobre ella. Ninguna disposición del Acuerdo supone cesión, licencia, autorización de explotación ni transmisión de derechos de propiedad intelectual o industrial, know-how, secretos empresariales o cualesquiera otros derechos.

El acceso se limita estrictamente a la finalidad definida en la Cláusula 1 y no concede derechos implícitos de:

a) Cesión de derechos de propiedad intelectual o industrial de ningún tipo.
b) Licencia, expresa o implícita, para reproducir, explotar, comercializar, adaptar o distribuir los desarrollos, soluciones o tecnologías mostradas.
c) Obligación de revelar información adicional ni de mantener la relación comercial iniciada.

Cualquier desarrollo, adaptación, mejora, resultado o entregable que se genere específicamente para la Empresa se regirá por el contrato o encargo específico que corresponda, en el que deberán regularse expresamente su titularidad y cesión de derechos. La mera revelación de Información Confidencial o la firma de este Acuerdo no atribuye automáticamente a ninguna parte la titularidad de desarrollos realizados por la otra. En todo caso, el Receptor no podrá incorporar, reproducir, transformar ni utilizar Información Confidencial de la Empresa en desarrollos propios o de terceros, ni solicitar derechos de propiedad industrial o intelectual sobre ella o sobre elementos que la incorporen.

## CLÁUSULA 5. DEVOLUCIÓN Y DESTRUCCIÓN DE INFORMACIÓN

A requerimiento escrito de la Parte Divulgadora, o cuando finalice la finalidad para la que se facilitó la Información Confidencial, y en todo caso a la terminación del Acuerdo, la Parte Receptora deberá, en un plazo máximo de cinco (5) días hábiles (o inmediatamente si así se solicita por existir un riesgo de divulgación o uso indebido) a:

a) Devolver toda la Información Confidencial en soporte físico, incluyendo todas las copias realizadas.
b) Destruir o borrar de forma permanente la Información Confidencial en soporte electrónico o digital, acreditándolo mediante declaración escrita firmada.
c) Eliminar cualquier referencia a la Información Confidencial de sus documentos, informes o notas de trabajo.

La Parte Receptora podrá conservar exclusivamente las copias cuya conservación venga impuesta por una obligación legal o regulatoria, o que permanezcan en copias de seguridad automáticas no accesibles en el curso ordinario. En ambos casos, deberá identificar y restringir dichas copias, no restaurarlas ni utilizarlas salvo necesidad técnica o legal, eliminarlas conforme al ciclo ordinario de retención y mantenerlas sujetas a este Acuerdo. La conservación de una copia no autoriza ningún otro uso. La certificación de devolución o destrucción será emitida por representante autorizado de la Parte Receptora.

## CLÁUSULA 6. PENALIZACIÓN POR INCUMPLIMIENTO

La Parte Receptora reconoce el elevado valor estratégico y comercial de la Información Confidencial revelada, así como los perjuicios que su divulgación no autorizada podría ocasionar a la Parte Divulgadora.

La parte que incumpla las obligaciones de confidencialidad, no uso, seguridad, devolución o destrucción previstas en este Acuerdo abonará a la parte cumplidora, en concepto de cláusula penal, diez mil euros (10.000 €) por cada incumplimiento independiente acreditado. Cuando el incumplimiento afecte a los Productos Protegidos, al código fuente, a secretos empresariales, a información de clientes o a una pluralidad de destinatarios, las partes reconocen que la cuantía podrá resultar insuficiente y la parte perjudicada podrá reclamar, en los términos permitidos por la ley, los daños y perjuicios adicionales que excedan de la pena, incluidos daño emergente y lucro cesante. La pena no limita el derecho a exigir el cese, la retirada de contenidos, la devolución o destrucción, ni a solicitar medidas cautelares. La aplicación de esta cláusula será recíproca cuando la información afectada sea confidencial del Receptor.

La cláusula penal se establece como valoración anticipada mínima de los perjuicios, sin perjuicio de la prueba y reclamación de los daños adicionales en los términos expresamente previstos en el párrafo anterior. La cuantía deberá revisarse y, en su caso, ajustarse atendiendo al valor, sensibilidad y volumen de la información que vaya a revelarse, para favorecer su proporcionalidad y exigibilidad.

## CLÁUSULA 7. CONSECUENCIAS DEL INCUMPLIMIENTO

Sin perjuicio de la cláusula penal y de cualesquiera otros derechos reconocidos legalmente, la Parte Divulgadora cuya información confidencial haya sido afectada podrá:

a) Revocar de forma inmediata el acceso del Receptor a cualquier información, entorno, sistema o recurso compartido.
b) Exigir la devolución o destrucción acreditada de toda la Información Confidencial, conforme a la Cláusula 5.
c) Reclamar la penalización y, en su caso, los daños y perjuicios en los términos de la Cláusula 6.
d) Solicitar medidas cautelares urgentes para cesar en la divulgación, al amparo de la Ley 1/2019 de Secretos Empresariales.
e) Ejercer cuantas acciones legales, civiles o penales, le correspondan conforme a la legislación vigente.

La parte perjudicada, además, podrá exigir la cesación inmediata del uso o divulgación, la retirada de materiales, la preservación de evidencias, la devolución o destrucción de la información y la adopción de medidas correctoras. Nada de lo previsto limitará las acciones y medidas previstas en la Ley 1/2019, de Secretos Empresariales, ni las acciones de propiedad intelectual o industrial que correspondan.

## CLÁUSULA 8. PROTECCIÓN DE DATOS PERSONALES (RGPD / LOPDGDD)

En el marco de este Acuerdo, las partes podrán intercambiar datos personales de sus respectivos empleados, representantes y contactos profesionales, actuando cada una como responsable independiente respecto de los tratamientos que realice para gestionar la relación. Cada parte cumplirá las obligaciones de información, licitud, minimización, seguridad y conservación que le correspondan conforme al RGPD y la LOPDGDD.

Si una parte permite a la otra acceder a datos personales por cuenta de aquella, las partes formalizarán antes del acceso el correspondiente contrato de encargo del tratamiento conforme al artículo 28 RGPD, con definición de objeto, duración, naturaleza, finalidad, categorías de datos e interesados e instrucciones documentadas. En ausencia de dicho contrato, no se permitirá el acceso ni tratamiento por cuenta de la otra parte. La confidencialidad de los datos personales se mantendrá también conforme a este Acuerdo.

## CLÁUSULA 9. VIGENCIA

El Acuerdo entrará en vigor en la fecha de su firma y cubrirá toda Información Confidencial revelada en relación con la finalidad descrita, incluida la revelada durante los seis (6) meses anteriores a la firma, siempre que se identifique o resulte razonablemente reconocible como confidencial. Permanecerá vigente durante cinco (5) años, salvo que las partes acuerden por escrito su terminación anticipada.

Las obligaciones de confidencialidad, no uso y protección subsistirán durante diez (10) años desde cada revelación. Respecto de la información que constituya secreto empresarial conforme a la Ley 1/2019, las obligaciones se mantendrán mientras la información conserve tal condición. Los datos personales, credenciales, información de seguridad y demás información sometida a deberes legales específicos permanecerán protegidos durante el plazo exigido por su normativa aplicable.

## CLÁUSULA 10. NO CONCURRENCIA

CLÁUSULA 10. PROTECCIÓN REFORZADA DE LOS PRODUCTOS PROTEGIDOS Y NO ELUSIÓN. El Receptor no podrá, durante la vigencia del Acuerdo ni posteriormente mientras la información mantenga carácter confidencial o de secreto empresarial, utilizar los Productos Protegidos o cualquier Información Confidencial de la Empresa para desarrollar, encargar, mejorar, comercializar o explotar productos o servicios propios o de terceros, ni para replicar sus funcionalidades, arquitectura, procesos, reglas, diseño, documentación o prestaciones. Tampoco podrá solicitar, registrar o procurar para sí o para terceros derechos de propiedad intelectual o industrial que incorporen o se basen en dicha información.

a) Desarrollar, comercializar, licenciar o explotar productos o servicios sustancialmente equivalentes a los Productos Protegidos.
b) Asesorar o participar en proyectos de terceros cuyo objeto sea el descrito en la letra anterior.
c) Ofrecer productos o servicios que concurran con los Productos Protegidos a los clientes que la Empresa le haya presentado o con los que haya tratado en el marco de la relación.

El Receptor no podrá utilizar la Información Confidencial para eludir a la Empresa, desplazarla de oportunidades comerciales conocidas a través de la relación, contactar o contratar directamente con clientes, proveedores, colaboradores o socios presentados por la Empresa con el propósito de apropiarse de la oportunidad o evitar la intervención de la Empresa, salvo autorización previa y escrita o relación previa que el Receptor pueda acreditar documentalmente.

Las prohibiciones anteriores no impedirán al Receptor desarrollar o comercializar productos o servicios genuinamente independientes, siempre que pueda acreditar documentalmente que no ha utilizado ni tenido acceso operativo a la Información Confidencial relevante. Tampoco restringen los conocimientos generales, experiencia profesional o habilidades residuales no identificables con la Información Confidencial, ni las actividades preexistentes acreditadas por escrito antes de la revelación. La carga de acreditar la concurrencia de estas circunstancias corresponderá al Receptor.

Esta cláusula no establece una prohibición general de competir ni limita la libertad profesional o empresarial del Receptor; prohíbe exclusivamente el uso indebido de Información Confidencial y la elusión de la Empresa en los términos aquí definidos. Si existiera una relación laboral, cualquier pacto de no competencia postcontractual deberá negociarse separadamente y cumplir los requisitos y compensación previstos en el artículo 21.2 del Estatuto de los Trabajadores.

## CLÁUSULA 11. LEGISLACIÓN APLICABLE Y JURISDICCIÓN

El presente Acuerdo se regirá e interpretará conforme a la legislación española vigente, en particular la Ley 1/2019 de Secretos Empresariales, el RDL 1/1996 (LPI), el RGPD, la LOPDGDD, el Código Civil y el Código de Comercio.

Para la resolución de cualquier controversia, siempre que la sumisión sea válida conforme a las normas procesales aplicables, las partes se someten expresamente a los Juzgados y Tribunales de Huesca, con renuncia a cualquier otro fuero disponible. Esta sumisión no impedirá solicitar medidas cautelares o de protección urgente ante cualquier órgano jurisdiccional competente.

## CLÁUSULA 12. DIVISIBILIDAD

Si cualquier cláusula o parte del Acuerdo fuera declarada nula, inválida o inaplicable por tribunal competente, dicha nulidad no afectará al resto, que permanecerá en plena vigencia. Las partes negociarán de buena fe la sustitución de la cláusula afectada por otra que refleje, en la mayor medida posible, la intención original.

## CLÁUSULA 13. ACUERDO COMPLETO Y MODIFICACIONES

El presente Acuerdo constituye el acuerdo íntegro entre las partes con respecto a su objeto y sustituye a cualquier acuerdo, propuesta o entendimiento verbal o escrito anterior. Cualquier modificación deberá realizarse por escrito y ser firmada por ambas partes. La falta de ejercicio o el retraso en el ejercicio de cualquier derecho no implicará renuncia al mismo.

El Anexo I, que figura al final de este documento, forma parte del presente Acuerdo. En él se añaden nuevos Productos Protegidos en la forma prevista, sin necesidad de suscribir un nuevo acuerdo.

## CLÁUSULA 14. COMUNICACIONES Y NOTIFICACIONES

Todas las comunicaciones derivadas de este Acuerdo se realizarán por escrito en español y se considerarán válidas las remitidas por correo electrónico que permitan acreditar su envío y recepción, o por correo certificado/burofax. Para la Empresa: support@mobilityforwork.es. Para el Receptor: el correo electrónico indicado en el encabezamiento. Cualquier cambio de dirección deberá notificarse conforme a esta cláusula. Las notificaciones de incidentes de seguridad se realizarán de forma inmediata por correo electrónico y por cualquier otro medio urgente disponible.

En prueba de conformidad, las partes suscriben el presente Acuerdo, junto con su Anexo I, en Barbastro (Huesca), a __ de __________ de ____.

## FIRMAS

**PARTE DIVULGADORA**
Nombre / Razón social: Félix Dia Morales / MOBIFORWORK S.L.
Cargo: CEO
CIF: ESB22430706
Fecha: ____________
Firma y sello: ________________________

**PARTE RECEPTORA**
Sociedad y NIF (si firma una sociedad): ${company ? `${plain(r.razonSocial, 'RAZÓN SOCIAL')} / ${plain(r.nif, 'NIF')}` : '—'}
Nombre completo: ${plain(r.nombre, 'NOMBRE DEL RECEPTOR')}
DNI/NIE/Pasaporte: ${plain(r.documento, 'DNI / NIE / PASAPORTE')}
Cargo (si firma una sociedad): ${company ? plain(r.cargo, 'CARGO') : '—'}
Email: ${plain(r.email, 'EMAIL DEL RECEPTOR')}
Fecha: ____________
Firma y sello: ________________________

## ANEXO I. PRODUCTOS PROTEGIDOS AÑADIDOS DESPUÉS DE LA FIRMA

Para proteger más productos, servicios o materiales después de la firma, se describen en el recuadro siguiente y ambas partes firman con la fecha (también con firma electrónica). Cada uno queda protegido desde esa fecha, con la misma protección que los Productos Protegidos del expositivo.

Productos Protegidos añadidos: ______________________________________________

Fecha (Anexo I): __ de __________ de ____
Firma de la Parte Divulgadora (Anexo I): ________________________
Firma de la Parte Receptora (Anexo I): ________________________

*Plantilla NDA — MOBIFORWORK S.L. · CIF ESB22430706 · P.I. Valle del Cinca, Calle D, n.º 53, 22300 Barbastro (Huesca) · support@mobilityforwork.es*
`;
}

/** Contract record defaults for an NDA generated from this template (F0). */
export const MFW_CONTRACT_DEFAULTS = {
  duracion: '5 años',
  jurisdiccion: 'España',
  ciudadJurisdiccion: 'Huesca',
  noCompetencia: true,
  penalizacion: true,
  survivalMonths: MFW_NDA_TEMPLATE.survivalMonths,
};
