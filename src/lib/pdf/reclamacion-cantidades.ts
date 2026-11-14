import { ReclamacionCantidadesModel } from '@/lib/validate-reclamacion-cantidades';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { registerDocumentFonts, DOC_FONT } from './fonts';
import { applyBrandingFonts, drawBrandedHeader } from './branding';
import type { ServerBranding } from '../branding-server';

// Configurar ruta de fuentes de PDFKit para Next.js
const setupPdfKitFonts = () => {
  try {
    // Intentar encontrar los archivos de fuente en node_modules
    const pdfkitPath = require.resolve('pdfkit');
    const pdfkitDir = path.dirname(pdfkitPath);
    
    // Buscar en diferentes ubicaciones posibles
    const possiblePaths = [
      path.join(pdfkitDir, 'js', 'data'),
      path.join(pdfkitDir, 'data'),
      path.join(process.cwd(), 'node_modules', 'pdfkit', 'js', 'data'),
      path.join(process.cwd(), 'node_modules', 'pdfkit', 'data'),
    ];
    
    for (const dataDir of possiblePaths) {
      if (fs.existsSync(dataDir)) {
        // Configurar la variable de entorno para PDFKit
        process.env.PDFKIT_FONT_PATH = dataDir;
        console.log(`✅ Fuentes de PDFKit encontradas en: ${dataDir}`);
        return true;
      }
    }
    
    console.warn('⚠️ No se encontraron archivos de fuente de PDFKit en las rutas esperadas');
  } catch (error: any) {
    console.warn('⚠️ No se pudo configurar fuentes de PDFKit:', error.message);
  }
  return false;
};

// Configurar fuentes al cargar el módulo
setupPdfKitFonts();

// Helper para configurar fuente de forma segura
function safeFont(doc: any, fontName: string): any {
  try {
    return doc.font(fontName);
  } catch (error: any) {
    // Si falla, intentar con fuente estándar
    try {
      // PDFKit tiene fuentes estándar integradas: DOC_FONT.body, 'Times-Roman', 'Courier'
      // Si DOC_FONT.heading falla, usar DOC_FONT.body y luego bold
      if (fontName.includes('Bold')) {
        return doc.font(DOC_FONT.body).fontSize(doc.currentLineHeight() || 12);
      }
      return doc.font(DOC_FONT.body);
    } catch (fallbackError: any) {
      // Si todo falla, simplemente continuar sin cambiar la fuente
      console.warn(`⚠️ No se pudo configurar fuente ${fontName}, usando fuente por defecto`);
      return doc;
    }
  }
}

export function renderReclamacionCantidadesPDF(modeloJSON: ReclamacionCantidadesModel, branding?: ServerBranding | null): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Crear documento PDF sin especificar fuente inicialmente
      // PDFKit usará las fuentes estándar que vienen integradas
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });
      applyBrandingFonts(doc, branding); // DS v4: EB Garamond (falls back to Times) or the brand font
      drawBrandedHeader(doc, branding); // no-op without branding
      
      // No especificar fuente inicialmente - PDFKit usará la fuente por defecto
      // Si faltan los TTF, registerDocumentFonts usa las fuentes estándar Times de PDFKit

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Nota aclaratoria (si existe)
      if (modeloJSON.notaAclaratoria) {
        doc.fontSize(9);
        safeFont(doc, DOC_FONT.body);
        doc.text(modeloJSON.notaAclaratoria, { align: 'justify' });
        doc.moveDown(2);
      }

      // Encabezado con Tribunal de Instancia (Ley Orgánica 1/2025)
      // Compatibilidad: usar 'tribunal' si existe, sino 'juzgado' (formato antiguo)
      const tribunalText = (modeloJSON.encabezado as any).tribunal || (modeloJSON.encabezado as any).juzgado || 'AL TRIBUNAL DE INSTANCIA, SECCIÓN SOCIAL QUE POR TURNO CORRESPONDA';
      doc.fontSize(12);
      safeFont(doc, DOC_FONT.heading);
      doc.text(tribunalText, { align: 'center' });
      
      doc.moveDown(2);

      // Datos del demandante con formato profesional
      const demandanteNombre = modeloJSON.demandante.nombre;
      const demandanteDNI = modeloJSON.demandante.dni;
      const demandanteDomicilio = modeloJSON.demandante.domicilio;
      const demandanteTelefono = modeloJSON.demandante.telefono;
      const demandanteEmail = (modeloJSON.demandante as any).email || '';
      
      doc.fontSize(11);
      safeFont(doc, DOC_FONT.body);
      doc.text(`DON/DOÑA ${demandanteNombre}, con DNI nº ${demandanteDNI}, domicilio en ${demandanteDomicilio}, teléfono ${demandanteTelefono}${demandanteEmail ? ` y correo electrónico ${demandanteEmail}` : ''}, ante el TRIBUNAL DE INSTANCIA comparezco y como mejor en Derecho proceda, DIGO:`, { align: 'justify' });
      
      doc.moveDown(1);

      // Demanda
      doc.fontSize(11);
      safeFont(doc, DOC_FONT.body);
      doc.text(`Que mediante el presente escrito y en la representación que ostento, de conformidad con lo dispuesto en los artículos 399 de la Ley de Enjuiciamiento Civil, paso a interponer DEMANDA DE JUICIO DECLARATIVO ORDINARIO en ejercicio de la acción de reclamación de cantidades frente a ${modeloJSON.demandada.nombre} con CIF ${modeloJSON.demandada.cif}, a citar en la persona de su representante legal, con sede social a efecto de notificaciones sita en ${modeloJSON.demandada.domicilio}, a fin de que se avenga a reconocer los siguientes`, { align: 'justify' });

      doc.moveDown(1);

      // H E C H O S
      doc.fontSize(12);
      safeFont(doc, DOC_FONT.heading);
      doc.text('H E C H O S', { align: 'center' });
      
      doc.moveDown(1);

      // PRIMERO
      doc.fontSize(11);
      safeFont(doc, DOC_FONT.heading);
      doc.text('PRIMERO.-', { continued: true });
      
      safeFont(doc, DOC_FONT.body);
      doc.text(` Que la trabajadora está contratada a jornada ${modeloJSON.hechos.primer.jornada} con un coeficiente de parcialidad de ${modeloJSON.hechos.primer.coeficienteParcialidad} realizando tareas de ${modeloJSON.hechos.primer.tareas} con una antigüedad de ${modeloJSON.hechos.primer.antiguedad}, y un contrato ${modeloJSON.hechos.primer.duracion}.`);
      
      doc.text(`Su salario es de ${modeloJSON.hechos.primer.salario} al mes con las pagas extras prorrateadas. El convenio colectivo de aplicación a la relación laboral es de ${modeloJSON.hechos.primer.convenio}.`);

      doc.moveDown(1);

      // SEGUNDO
      doc.fontSize(11);
      safeFont(doc, DOC_FONT.heading);
      doc.text('SEGUNDO.-', { continued: true });
      
      safeFont(doc, DOC_FONT.body);
      doc.text(' Que de la citada relación laboral la empresa le adeuda las siguientes cantidades:');
      
      modeloJSON.hechos.segundo.cantidadesAdeudadas.forEach(cantidad => {
        doc.text(`• ${cantidad}`, { indent: 20 });
      });

      if (modeloJSON.hechos.segundo.interesDemora) {
        doc.text(' Todos estos importes salariales deberán incrementarse con el 10% del interés demora del artículo 29 del Estatuto de los Trabajadores');
      }

      doc.moveDown(1);

      // TERCERO
      doc.fontSize(11);
      safeFont(doc, DOC_FONT.heading);
      doc.text('TERCERO.-', { continued: true });
      
      safeFont(doc, DOC_FONT.body);
      doc.text(' Que la trabajadora no ostentan, ni ha ostentado en el último año, cargo de carácter sindical.');

      doc.moveDown(1);

      // CUARTO
      doc.fontSize(11);
      safeFont(doc, DOC_FONT.heading);
      doc.text('CUARTO.-', { continued: true });
      
      safeFont(doc, DOC_FONT.body);
      doc.text(` Se presentó papeleta de conciliación laboral el ${modeloJSON.hechos.cuarto.fechaPapeleta}, celebrando el acto de conciliación el día ${modeloJSON.hechos.cuarto.fechaConciliacion} con el resultado de ${modeloJSON.hechos.cuarto.resultado}. Se adjunta como documento número 1 el acta de conciliación.`);

      doc.moveDown(2);

      // FUNDAMENTOS DE DERECHO
      doc.fontSize(12);
      safeFont(doc, DOC_FONT.heading);
      doc.text('F U N D A M E N T O S  D E  D E R E C H O', { align: 'center' });
      
      doc.moveDown(1);

      // I.- Fundamentos de derecho (con texto completo mejorado)
      doc.fontSize(11);
      safeFont(doc, DOC_FONT.heading);
      doc.text('I.-', { continued: true });
      safeFont(doc, DOC_FONT.body);
      doc.text(` ${modeloJSON.fundamentos.primero}`, {
        align: 'justify',
        lineGap: 2
      });

      doc.moveDown(0.5);

      // II.- Fundamentos de derecho (con texto completo mejorado)
      doc.fontSize(11);
      safeFont(doc, DOC_FONT.heading);
      doc.text('II.-', { continued: true });
      safeFont(doc, DOC_FONT.body);
      doc.text(` ${modeloJSON.fundamentos.segundo}`, {
        align: 'justify',
        lineGap: 2
      });

      doc.moveDown(0.5);

      // III.- Fundamentos de derecho (con texto completo mejorado)
      doc.fontSize(11);
      safeFont(doc, DOC_FONT.heading);
      doc.text('III.-', { continued: true });
      safeFont(doc, DOC_FONT.body);
      doc.text(` ${modeloJSON.fundamentos.tercero}`, {
        align: 'justify',
        lineGap: 2
      });

      doc.moveDown(0.5);

      // IV.- Fundamentos de derecho (con texto completo mejorado)
      doc.fontSize(11);
      safeFont(doc, DOC_FONT.heading);
      doc.text('IV.-', { continued: true });
      safeFont(doc, DOC_FONT.body);
      doc.text(` ${modeloJSON.fundamentos.cuarto}`, {
        align: 'justify',
        lineGap: 2
      });

      doc.moveDown(2);

      // PETITORIO
      doc.fontSize(11);
      safeFont(doc, DOC_FONT.body);
      doc.text('Por lo expuesto,', { align: 'center' });
      
      doc.moveDown(1);

      doc.fontSize(11);
      safeFont(doc, DOC_FONT.body);
      doc.text(`SOLICITO AL JUZGADO DE LO SOCIAL ${modeloJSON.encabezado.localidad} que, tenga por presentado este escrito con sus copias, se sirva admitirlo, tenga por interesada DEMANDA DE RECLAMACIÓN DE CANTIDAD frente a ${modeloJSON.demandada.nombre} se proceda a convocar a las partes para los actos de conciliación y juicio, en la debida forma, por el que, seguido de todos sus trámites legales oportunos, se dicte en su día sentencia estimando íntegramente la presente demanda, condenando a la mercantil a abonar a Doña ${modeloJSON.demandante.nombre} la cantidad de ${modeloJSON.petitorio.cantidadReclamada} euros más los intereses de demora del artículo 29 del Estatuto de los Trabajadores, pues es de hacer justicia lo que se solicita en ${modeloJSON.petitorio.lugar}, a ${modeloJSON.petitorio.fecha}.`);

      doc.moveDown(2);

      doc.fontSize(11);
      safeFont(doc, DOC_FONT.body);
      doc.text('Fdo.: La Trabajadora', { align: 'right' });

      doc.moveDown(2);

      // OTROSI
      doc.fontSize(11);
      safeFont(doc, DOC_FONT.heading);
      doc.text('OTROSI DIGO:', { continued: true });
      
      safeFont(doc, DOC_FONT.body);
      doc.text(' Que al acto de juicio compareceré asistido por abogado para que me defienda, en conformidad con el artículo 21.2 de la Ley reguladora de la jurisdicción social.');

      doc.moveDown(1);

      doc.fontSize(11);
      safeFont(doc, DOC_FONT.heading);
      doc.text('SEGUNDO OTROSI DIGO:', { continued: true });
      
      safeFont(doc, DOC_FONT.body);
      doc.text(' Que interesa al derecho de esta parte, y sin perjuicio de ampliación en el momento procesal oportuno, los siguientes MEDIOS DE PRUEBA para que se requieran a la demandada y sean aportadas en el acto del juicio:');

      doc.moveDown(1);

      doc.fontSize(11);
      safeFont(doc, DOC_FONT.heading);
      doc.text('1. DOCUMENTAL, consistente en requerir a la empresa para que aporte:');
      
      modeloJSON.otrosi.mediosPrueba.documental.forEach((prueba, index) => {
        doc.text(`${String.fromCharCode(97 + index)}. ${prueba}.`, { indent: 20 });
      });

      doc.moveDown(1);

      doc.fontSize(11);
      safeFont(doc, DOC_FONT.heading);
      doc.text('2. INTERROGATORIO', { continued: true });
      
      safeFont(doc, DOC_FONT.body);
      doc.text(` del representante legal de la mercantil ${modeloJSON.demandada.nombre} con indicación de que si no comparece, se podrán tener por ciertos los hechos de la demanda en que hubiera intervenido personalmente y le resultaren en todo o en parte perjudiciales (Art. 91.2 LJS)`);

      doc.moveDown(2);

      doc.fontSize(11);
      safeFont(doc, DOC_FONT.body);
      doc.text('SUPLICO AL JUZGADO DE LO SOCIAL tenga por hecha tal manifestación a los a los efectos oportunos, admita y declare pertinentes las pruebas que se dejan propuestas, y acuerde cuanto sea preciso para llevarlas a efecto.');

      doc.moveDown(2);

      doc.fontSize(11);
      safeFont(doc, DOC_FONT.body);
      doc.text(`Mismo lugar y fecha`, { align: 'center' });
      
      doc.text('Fdo:', { align: 'center' });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}


