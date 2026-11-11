import PDFDocument from 'pdfkit';
import { registerDocumentFonts, DOC_FONT } from './fonts';

interface EmailData {
  userData: any;
  userSummary: any;
  emailType: string;
  emailContent: any;
  chatgptUsed: boolean;
}

export async function generateEmailPDF(data: EmailData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      size: 'A4', 
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `Email de Fidelización - ${data.userData.displayName}`,
        Author: 'Avocat LegalTech',
        Subject: `Email ${data.emailType.toUpperCase()}`,
        Creator: 'Avocat LegalTech v3'
      }
    });
    registerDocumentFonts(doc); // DS v4: EB Garamond (falls back to Times)

    let buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // PÁGINA 1: Header y Estadísticas
    generateHeader(doc, data);
    generateStats(doc, data);
    generateMainContent(doc, data);

    // PÁGINA 2: Recomendaciones y Próximos Pasos
    doc.addPage();
    generateRecommendations(doc, data);
    generateNextSteps(doc, data);

    // PÁGINA 3: Información Técnica y Footer
    doc.addPage();
    generateTechnicalInfo(doc, data);
    generateFooter(doc, data);

    doc.end();
  });
}

function generateHeader(doc: any, data: EmailData) {
  // Fondo del header
  doc.rect(0, 0, doc.page.width, 120)
     .fill('#4a90e2');

  // Título principal
  doc.fillColor('white')
     .fontSize(28)
     .font(DOC_FONT.heading)
     .text('📧 Email de Fidelización', 50, 30, { align: 'center' });

  // Subtítulo
  doc.fontSize(16)
     .font(DOC_FONT.body)
     .text(data.emailContent.title, 50, 70, { align: 'center' });

  // Badge del tipo de email
  const badgeWidth = 120;
  const badgeHeight = 25;
  const badgeX = doc.page.width - badgeWidth - 50;
  const badgeY = 20;

  doc.rect(badgeX, badgeY, badgeWidth, badgeHeight)
     .fill('#357abd');
  
  doc.fillColor('white')
     .fontSize(12)
     .font(DOC_FONT.heading)
     .text(data.emailType.toUpperCase(), badgeX + 10, badgeY + 8);

  // Información del destinatario
  doc.fillColor('#2c3e50')
     .fontSize(14)
     .font(DOC_FONT.heading)
     .text('📋 Información del Destinatario', 50, 140);

  doc.fontSize(12)
     .font(DOC_FONT.body)
     .text(`Para: ${data.userData.displayName || 'Cliente'} (${data.userData.email})`, 50, 165)
     .text(`Plan: ${data.userData.subscription?.plan || 'Gratuito'}`, 50, 180)
     .text(`Tipo: ${data.emailType.toUpperCase()}`, 50, 195)
     .text(`Generado: ${new Date().toLocaleString('es-ES')}`, 50, 210);
}

function generateStats(doc: any, data: EmailData) {
  const { summary } = data.userSummary;
  
  doc.fillColor('#2c3e50')
     .fontSize(16)
     .font(DOC_FONT.heading)
     .text('📊 Estadísticas de Uso', 50, 250);

  // Grid de estadísticas
  const stats = [
    { label: 'Documentos Generados', value: summary.totalDocuments || 0 },
    { label: 'Inversión Total', value: `€${summary.totalSpent || 0}` },
    { label: 'Tasa de Éxito', value: `${((summary.successRate || 0) * 100).toFixed(1)}%` },
    { label: 'Tiempo Promedio', value: `${summary.averageProcessingTime || 0}ms` }
  ];

  const startY = 280;
  const cardWidth = 120;
  const cardHeight = 60;
  const spacing = 20;

  stats.forEach((stat, index) => {
    const x = 50 + (index % 2) * (cardWidth + spacing);
    const y = startY + Math.floor(index / 2) * (cardHeight + spacing);

    // Fondo de la tarjeta
    doc.rect(x, y, cardWidth, cardHeight)
       .fill('#f8f9fa')
       .stroke('#4a90e2');

    // Valor
    doc.fillColor('#4a90e2')
       .fontSize(18)
       .font(DOC_FONT.heading)
       .text(stat.value, x + 10, y + 10);

    // Etiqueta
    doc.fillColor('#6c757d')
       .fontSize(10)
       .font(DOC_FONT.body)
       .text(stat.label, x + 10, y + 35, { width: cardWidth - 20 });
  });
}

function generateMainContent(doc: any, data: EmailData) {
  doc.fillColor('#2c3e50')
     .fontSize(16)
     .font(DOC_FONT.heading)
     .text('📝 Contenido del Email', 50, 420);

  // Contenido del email
  doc.fillColor('#333')
     .fontSize(12)
     .font(DOC_FONT.body)
     .text(data.emailContent.body, 50, 450, { 
       width: doc.page.width - 100,
       align: 'justify'
     });
}

function generateRecommendations(doc: any, data: EmailData) {
  // Título de la página
  doc.fillColor('#2c3e50')
     .fontSize(20)
     .font(DOC_FONT.heading)
     .text('🎯 Recomendaciones Personalizadas', 50, 50, { align: 'center' });

  // Sección de recomendaciones
  doc.fillColor('#4a90e2')
     .fontSize(16)
     .font(DOC_FONT.heading)
     .text('Basado en tu perfil de usuario:', 50, 100);

  const recommendations = [
    'Optimización de flujo de trabajo legal',
    'Acceso a plantillas especializadas',
    'Integración con sistemas de gestión',
    'Soporte técnico prioritario',
    'Análisis de IA avanzado',
    'Reportes personalizados'
  ];

  let y = 130;
  recommendations.forEach((rec, index) => {
    doc.fillColor('#28a745')
       .fontSize(14)
       .font(DOC_FONT.heading)
       .text('✓', 50, y);
    
    doc.fillColor('#333')
       .fontSize(12)
       .font(DOC_FONT.body)
       .text(rec, 70, y);
    
    y += 25;
  });

  // Sección de próximos pasos
  doc.fillColor('#4a90e2')
     .fontSize(16)
     .font(DOC_FONT.heading)
     .text('📈 Próximos Pasos Sugeridos', 50, 300);

  const nextSteps = [
    'Explorar nuevas funcionalidades',
    'Configurar notificaciones personalizadas',
    'Participar en webinars exclusivos',
    'Conectar con la comunidad legal',
    'Actualizar plan de suscripción',
    'Configurar integraciones'
  ];

  y = 330;
  nextSteps.forEach((step, index) => {
    doc.fillColor('#17a2b8')
       .fontSize(14)
       .font(DOC_FONT.heading)
       .text('→', 50, y);
    
    doc.fillColor('#333')
       .fontSize(12)
       .font(DOC_FONT.body)
       .text(step, 70, y);
    
    y += 25;
  });
}

function generateNextSteps(doc: any, data: EmailData) {
  // Esta función ya está implementada en generateRecommendations
  // Se mantiene para futuras expansiones
}

function generateTechnicalInfo(doc: any, data: EmailData) {
  // Título de la página
  doc.fillColor('#2c3e50')
     .fontSize(20)
     .font(DOC_FONT.heading)
     .text('🔧 Información Técnica', 50, 50, { align: 'center' });

  // Información del sistema
  doc.fillColor('#4a90e2')
     .fontSize(16)
     .font(DOC_FONT.heading)
     .text('Detalles del Sistema:', 50, 100);

  const technicalInfo = [
    `Tipo de Email: ${data.emailType.toUpperCase()}`,
    `Generado por: ${data.chatgptUsed ? 'ChatGPT-4o' : 'Sistema Fallback'}`,
    `Fecha de Generación: ${new Date().toLocaleString('es-ES')}`,
    `Usuario ID: ${data.userData.uid}`,
    `Plan del Usuario: ${data.userData.subscription?.plan || 'Gratuito'}`,
    `Tasa de Éxito: ${((data.userSummary.summary.successRate || 0) * 100).toFixed(1)}%`,
    `Documentos Totales: ${data.userSummary.summary.totalDocuments || 0}`,
    `Inversión Total: €${data.userSummary.summary.totalSpent || 0}`
  ];

  let y = 130;
  technicalInfo.forEach((info, index) => {
    doc.fillColor('#333')
       .fontSize(12)
       .font(DOC_FONT.body)
       .text(info, 50, y);
    
    y += 20;
  });

  // Gráfico de rendimiento (simulado)
  doc.fillColor('#4a90e2')
     .fontSize(16)
     .font(DOC_FONT.heading)
     .text('📊 Gráfico de Rendimiento', 50, 300);

  // Simular gráfico con rectángulos
  const barWidth = 40;
  const barSpacing = 60;
  const baseY = 350;
  const maxHeight = 100;

  const metrics = [
    { label: 'Docs', value: data.userSummary.summary.totalDocuments || 0, max: 20 },
    { label: 'Éxito', value: (data.userSummary.summary.successRate || 0) * 100, max: 100 },
    { label: 'Tiempo', value: Math.max(0, 100 - (data.userSummary.summary.averageProcessingTime || 0) / 100), max: 100 }
  ];

  metrics.forEach((metric, index) => {
    const x = 50 + index * barSpacing;
    const height = (metric.value / metric.max) * maxHeight;
    const y = baseY + maxHeight - height;

    // Barra del gráfico
    doc.rect(x, y, barWidth, height)
       .fill('#4a90e2');

    // Etiqueta
    doc.fillColor('#333')
       .fontSize(10)
       .font(DOC_FONT.body)
       .text(metric.label, x, baseY + maxHeight + 10, { width: barWidth, align: 'center' });
  });
}

function generateFooter(doc: any, data: EmailData) {
  const footerY = doc.page.height - 100;

  // Línea separadora
  doc.strokeColor('#e9ecef')
     .lineWidth(2)
     .moveTo(50, footerY - 20)
     .lineTo(doc.page.width - 50, footerY - 20)
     .stroke();

  // Información de contacto
  doc.fillColor('#2c3e50')
     .fontSize(14)
     .font(DOC_FONT.heading)
     .text('Avocat LegalTech', 50, footerY, { align: 'center' });

  doc.fillColor('#6c757d')
     .fontSize(10)
     .font(DOC_FONT.body)
     .text('Gracias por confiar en nosotros', 50, footerY + 20, { align: 'center' })
     .text('Este email fue generado automáticamente', 50, footerY + 35, { align: 'center' });

  // Número de página
  doc.fillColor('#6c757d')
     .fontSize(10)
     .font(DOC_FONT.body)
     .text(`Página ${doc.page.number}`, doc.page.width - 100, footerY + 20);
}


