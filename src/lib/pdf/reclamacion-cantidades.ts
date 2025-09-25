import { ReclamacionCantidadesModel } from '@/lib/validate-reclamacion-cantidades';
import PDFDocument from 'pdfkit';

export function renderReclamacionCantidadesPDF(modeloJSON: ReclamacionCantidadesModel): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Encabezado
      doc.fontSize(12).font('Helvetica-Bold')
         .text(modeloJSON.encabezado.juzgado, { align: 'center' });
      
      doc.moveDown(2);

      // Datos del demandante
      doc.fontSize(11).font('Helvetica-Bold')
         .text(`Doña ${modeloJSON.demandante.nombre} con DNI ${modeloJSON.demandante.dni}, con domicilio a efecto de notificaciones en ${modeloJSON.demandante.domicilio} y número de teléfono ${modeloJSON.demandante.telefono} ante el JUZGADO DE LO SOCIAL comparezco y como mejor proceda en Derecho`);
      
      doc.moveDown(1);

      // D I G O
      doc.fontSize(12).font('Helvetica-Bold')
         .text('D I G O', { align: 'center' });
      
      doc.moveDown(1);

      // Demanda
      doc.fontSize(11).font('Helvetica')
         .text(`Que por medio del presente interpongo DEMANDA DE RECLAMACIÓN DE CANTIDAD frente a ${modeloJSON.demandada.nombre} con CIF ${modeloJSON.demandada.cif}, a citar en la persona de su representante legal, con sede social a efecto de notificaciones sita en ${modeloJSON.demandada.domicilio} a fin de que se avenga a reconocer los siguientes`);

      doc.moveDown(1);

      // H E C H O S
      doc.fontSize(12).font('Helvetica-Bold')
         .text('H E C H O S', { align: 'center' });
      
      doc.moveDown(1);

      // PRIMERO
      doc.fontSize(11).font('Helvetica-Bold')
         .text('PRIMERO.-', { continued: true });
      
      doc.font('Helvetica')
         .text(` Que la trabajadora está contratada a jornada ${modeloJSON.hechos.primer.jornada} con un coeficiente de parcialidad de ${modeloJSON.hechos.primer.coeficienteParcialidad} realizando tareas de ${modeloJSON.hechos.primer.tareas} con una antigüedad de ${modeloJSON.hechos.primer.antiguedad}, y un contrato ${modeloJSON.hechos.primer.duracion}.`);
      
      doc.text(`Su salario es de ${modeloJSON.hechos.primer.salario} al mes con las pagas extras prorrateadas. El convenio colectivo de aplicación a la relación laboral es de ${modeloJSON.hechos.primer.convenio}.`);

      doc.moveDown(1);

      // SEGUNDO
      doc.fontSize(11).font('Helvetica-Bold')
         .text('SEGUNDO.-', { continued: true });
      
      doc.font('Helvetica')
         .text(' Que de la citada relación laboral la empresa le adeuda las siguientes cantidades:');
      
      modeloJSON.hechos.segundo.cantidadesAdeudadas.forEach(cantidad => {
        doc.text(`• ${cantidad}`, { indent: 20 });
      });

      if (modeloJSON.hechos.segundo.interesDemora) {
        doc.text(' Todos estos importes salariales deberán incrementarse con el 10% del interés demora del artículo 29 del Estatuto de los Trabajadores');
      }

      doc.moveDown(1);

      // TERCERO
      doc.fontSize(11).font('Helvetica-Bold')
         .text('TERCERO.-', { continued: true });
      
      doc.font('Helvetica')
         .text(' Que la trabajadora no ostentan, ni ha ostentado en el último año, cargo de carácter sindical.');

      doc.moveDown(1);

      // CUARTO
      doc.fontSize(11).font('Helvetica-Bold')
         .text('CUARTO.-', { continued: true });
      
      doc.font('Helvetica')
         .text(` Se presentó papeleta de conciliación laboral el ${modeloJSON.hechos.cuarto.fechaPapeleta}, celebrando el acto de conciliación el día ${modeloJSON.hechos.cuarto.fechaConciliacion} con el resultado de ${modeloJSON.hechos.cuarto.resultado}. Se adjunta como documento número 1 el acta de conciliación.`);

      doc.moveDown(2);

      // FUNDAMENTOS DE DERECHO
      doc.fontSize(12).font('Helvetica-Bold')
         .text('F U N D A M E N T O S  D E  D E R E C H O', { align: 'center' });
      
      doc.moveDown(1);

      doc.fontSize(11).font('Helvetica-Bold')
         .text('I.-', { continued: true });
      doc.font('Helvetica')
         .text(` ${modeloJSON.fundamentos.primero}, siendo competente dicho Juzgado de lo Social en razón de la materia y territorio.`);

      doc.moveDown(0.5);

      doc.fontSize(11).font('Helvetica-Bold')
         .text('II.-', { continued: true });
      doc.font('Helvetica')
         .text(` ${modeloJSON.fundamentos.segundo}.`);

      doc.moveDown(0.5);

      doc.fontSize(11).font('Helvetica-Bold')
         .text('III.-', { continued: true });
      doc.font('Helvetica')
         .text(` ${modeloJSON.fundamentos.tercero}.`);

      doc.moveDown(0.5);

      doc.fontSize(11).font('Helvetica-Bold')
         .text('IV.-', { continued: true });
      doc.font('Helvetica')
         .text(` ${modeloJSON.fundamentos.cuarto}.`);

      doc.moveDown(2);

      // PETITORIO
      doc.fontSize(11).font('Helvetica')
         .text('Por lo expuesto,', { align: 'center' });
      
      doc.moveDown(1);

      doc.fontSize(11).font('Helvetica')
         .text(`SOLICITO AL JUZGADO DE LO SOCIAL ${modeloJSON.encabezado.localidad} que, tenga por presentado este escrito con sus copias, se sirva admitirlo, tenga por interesada DEMANDA DE RECLAMACIÓN DE CANTIDAD frente a ${modeloJSON.demandada.nombre} se proceda a convocar a las partes para los actos de conciliación y juicio, en la debida forma, por el que, seguido de todos sus trámites legales oportunos, se dicte en su día sentencia estimando íntegramente la presente demanda, condenando a la mercantil a abonar a Doña ${modeloJSON.demandante.nombre} la cantidad de ${modeloJSON.petitorio.cantidadReclamada} euros más los intereses de demora del artículo 29 del Estatuto de los Trabajadores, pues es de hacer justicia lo que se solicita en ${modeloJSON.petitorio.lugar}, a ${modeloJSON.petitorio.fecha}.`);

      doc.moveDown(2);

      doc.fontSize(11).font('Helvetica')
         .text('Fdo.: La Trabajadora', { align: 'right' });

      doc.moveDown(2);

      // OTROSI
      doc.fontSize(11).font('Helvetica-Bold')
         .text('OTROSI DIGO:', { continued: true });
      
      doc.font('Helvetica')
         .text(' Que al acto de juicio compareceré asistido por abogado para que me defienda, en conformidad con el artículo 21.2 de la Ley reguladora de la jurisdicción social.');

      doc.moveDown(1);

      doc.fontSize(11).font('Helvetica-Bold')
         .text('SEGUNDO OTROSI DIGO:', { continued: true });
      
      doc.font('Helvetica')
         .text(' Que interesa al derecho de esta parte, y sin perjuicio de ampliación en el momento procesal oportuno, los siguientes MEDIOS DE PRUEBA para que se requieran a la demandada y sean aportadas en el acto del juicio:');

      doc.moveDown(1);

      doc.fontSize(11).font('Helvetica-Bold')
         .text('1. DOCUMENTAL, consistente en requerir a la empresa para que aporte:');
      
      modeloJSON.otrosi.mediosPrueba.documental.forEach((prueba, index) => {
        doc.text(`${String.fromCharCode(97 + index)}. ${prueba}.`, { indent: 20 });
      });

      doc.moveDown(1);

      doc.fontSize(11).font('Helvetica-Bold')
         .text('2. INTERROGATORIO', { continued: true });
      
      doc.font('Helvetica')
         .text(` del representante legal de la mercantil ${modeloJSON.demandada.nombre} con indicación de que si no comparece, se podrán tener por ciertos los hechos de la demanda en que hubiera intervenido personalmente y le resultaren en todo o en parte perjudiciales (Art. 91.2 LJS)`);

      doc.moveDown(2);

      doc.fontSize(11).font('Helvetica')
         .text('SUPLICO AL JUZGADO DE LO SOCIAL tenga por hecha tal manifestación a los a los efectos oportunos, admita y declare pertinentes las pruebas que se dejan propuestas, y acuerde cuanto sea preciso para llevarlas a efecto.');

      doc.moveDown(2);

      doc.fontSize(11).font('Helvetica')
         .text(`Mismo lugar y fecha`, { align: 'center' });
      
      doc.text('Fdo:', { align: 'center' });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}


