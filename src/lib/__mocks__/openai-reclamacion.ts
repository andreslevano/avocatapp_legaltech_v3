// Mock data para reclamación de cantidades cuando OpenAI no está disponible
export function generateReclamacionCantidadMock(data: any) {
  return {
    cauceRecomendado: "Juicio Monitorio",
    jurisdiccion: "Juzgado de Primera Instancia",
    fundamentos: [
      "El artículo 1.101 del Código Civil establece que 'toda obligación consiste en dar, hacer o no hacer alguna cosa'.",
      "El artículo 1.108 del Código Civil dispone que 'el cumplimiento de las obligaciones consiste en la realización efectiva de la prestación que constituye su objeto'.",
      "El artículo 1.109 del Código Civil establece que 'las obligaciones de dar llevan consigo la de entregar la cosa y conservarla hasta la entrega'."
    ],
    hechos: [
      `El demandante ${data.acreedor?.nombre || 'Juan Pérez'} y el demandado ${data.deudor?.nombre || 'María García'} mantuvieron relaciones contractuales durante el período comprendido entre ${data.fechaInicio || 'enero de 2023'} y ${data.fechaFin || 'diciembre de 2023'}.`,
      `Como consecuencia de dichas relaciones, el demandado contrajo con el demandante una deuda por importe de ${data.cuantia || '1.500,00'} euros, cantidad que se encuentra debidamente documentada.`,
      `A pesar de las reiteradas reclamaciones efectuadas por el demandante, el demandado no ha procedido al pago de la cantidad adeudada, incurriendo en mora.`
    ],
    fundamentosJuridicos: [
      "El artículo 1.101 del Código Civil establece que 'toda obligación consiste en dar, hacer o no hacer alguna cosa'.",
      "El artículo 1.108 del Código Civil dispone que 'el cumplimiento de las obligaciones consiste en la realización efectiva de la prestación que constituye su objeto'.",
      "El artículo 1.109 del Código Civil establece que 'las obligaciones de dar llevan consigo la de entregar la cosa y conservarla hasta la entrega'.",
      "El artículo 1.101 del Código Civil establece que 'el deudor no se libera de la obligación por no cumplirla, sino por cumplirla'."
    ],
    conclusiones: [
      "Que el demandado contrajo con el demandante una deuda por importe de 1.500,00 euros.",
      "Que dicha deuda se encuentra debidamente documentada y justificada.",
      "Que el demandado ha incurrido en mora al no proceder al pago de la cantidad adeudada.",
      "Que procede la condena del demandado al pago de la cantidad reclamada, más los intereses de demora y las costas del presente procedimiento."
    ],
    pretensiones: [
      "Que se condene al demandado al pago de la cantidad de 1.500,00 euros, más los intereses de demora desde la fecha de vencimiento hasta el pago efectivo.",
      "Que se condenen al demandado las costas del presente procedimiento.",
      "Que se declare la procedencia de la vía ejecutiva para el cobro de la cantidad reclamada."
    ],
    documentos: [
      "Contratos o documentos que acrediten la relación jurídica entre las partes.",
      "Facturas, albaranes o documentos de entrega de bienes o servicios.",
      "Correspondencia o comunicaciones que acrediten la existencia de la deuda.",
      "Cualquier otro documento que pueda ser relevante para la resolución del asunto."
    ],
    testigos: [
      "Testigo 1: Persona que presenció la entrega de los bienes o la prestación de los servicios.",
      "Testigo 2: Persona que puede acreditar las comunicaciones entre las partes.",
      "Testigo 3: Persona que puede confirmar la existencia de la deuda."
    ],
    fecha: new Date().toLocaleDateString('es-ES'),
    lugar: "Madrid",
    firma: "El Abogado"
  };
}

