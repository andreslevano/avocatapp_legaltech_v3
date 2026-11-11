import jsPDF from 'jspdf';
import { primitives as P } from '@/lib/tokens';

// Configuración de fuentes y estilos
const FONT_SIZES = {
  title: 16,
  subtitle: 14,
  header: 12,
  body: 10,
  small: 8
};

const COLORS = {
  primary: P['neutral-900'],
  secondary: P['neutral-600'],
  accent: P['info-600'],
  border: P['neutral-200']
};

// Función para generar PDF profesional
export const generateLegalPDF = (documentData: {
  title: string;
  areaLegal: string;
  tipoEscrito: string;
  content: string;
  datosCliente?: any;
  hechos: string;
  peticiones: string;
  tono: string;
}) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Función helper para agregar texto con salto de línea automático
  const addText = (text: string, fontSize: number, isBold: boolean = false, color: string = COLORS.primary) => {
    doc.setFontSize(fontSize);
    doc.setTextColor(color);
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    
    const lines = doc.splitTextToSize(text, pageWidth - 40);
    doc.text(lines, 20, yPosition);
    yPosition += lines.length * (fontSize * 0.4) + 5;
  };

  // Función para agregar línea separadora
  const addSeparator = () => {
    doc.setDrawColor(COLORS.border);
    doc.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 10;
  };

  // Función para agregar sección
  const addSection = (title: string, content: string) => {
    addText(title, FONT_SIZES.subtitle, true, COLORS.accent);
    yPosition += 5;
    addText(content, FONT_SIZES.body);
    yPosition += 10;
  };

  // Encabezado del documento
  addText('AVOCAT LEGALTECH', FONT_SIZES.title, true, COLORS.accent);
  addText('Plataforma de Documentos Legales', FONT_SIZES.header, false, COLORS.secondary);
  addSeparator();

  // Información del documento
  addText(`TIPO DE DOCUMENTO: ${documentData.tipoEscrito}`, FONT_SIZES.header, true);
  addText(`ÁREA LEGAL: ${documentData.areaLegal}`, FONT_SIZES.header, true);
  addText(`FECHA: ${new Date().toLocaleDateString('es-ES')}`, FONT_SIZES.header, true);
  addSeparator();

  // Datos del cliente si están disponibles
  if (documentData.datosCliente) {
    addText('DATOS DE LAS PARTES', FONT_SIZES.subtitle, true, COLORS.accent);
    yPosition += 5;
    
    if (documentData.datosCliente.nombre) {
      addText(`Nombre: ${documentData.datosCliente.nombre}`, FONT_SIZES.body);
    }
    if (documentData.datosCliente.dni) {
      addText(`DNI: ${documentData.datosCliente.dni}`, FONT_SIZES.body);
    }
    if (documentData.datosCliente.direccion) {
      addText(`Dirección: ${documentData.datosCliente.direccion}`, FONT_SIZES.body);
    }
    if (documentData.datosCliente.telefono) {
      addText(`Teléfono: ${documentData.datosCliente.telefono}`, FONT_SIZES.body);
    }
    if (documentData.datosCliente.email) {
      addText(`Email: ${documentData.datosCliente.email}`, FONT_SIZES.body);
    }
    addSeparator();
  }

  // Contenido principal del documento
  addText('DOCUMENTO LEGAL', FONT_SIZES.title, true, COLORS.accent);
  yPosition += 10;

  // Dividir el contenido en secciones
  const contentSections = documentData.content.split('\n\n');
  
  for (const section of contentSections) {
    if (section.trim()) {
      // Detectar tipo de sección por palabras clave
      if (section.includes('AL TRIBUNAL') || section.includes('AL JUZGADO')) {
        addText(section, FONT_SIZES.header, true);
      } else if (section.includes('HECHOS') || section.includes('FUNDAMENTOS') || section.includes('SUPLICO') || section.includes('PETICIONES')) {
        addText(section, FONT_SIZES.subtitle, true, COLORS.accent);
      } else {
        addText(section, FONT_SIZES.body);
      }
      yPosition += 5;
    }
  }

  // Agregar pie de página
  const currentPage = doc.getCurrentPageInfo().pageNumber;
  const totalPages = doc.getNumberOfPages();
  
  doc.setFontSize(FONT_SIZES.small);
  doc.setTextColor(COLORS.secondary);
  doc.text(`Página ${currentPage} de ${totalPages}`, pageWidth - 40, pageHeight - 10);
  doc.text('Generado por Avocat LegalTech', 20, pageHeight - 10);

  return doc;
};

// Función para generar PDF con plantilla específica por área legal
export const generateAreaSpecificPDF = (areaLegal: string, tipoEscrito: string, content: string, datosCliente?: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Plantillas específicas por área legal
  const templates = {
    'Derecho Civil y Procesal Civil': {
      header: 'DEMANDA CIVIL',
      color: P['info-600'],
      sections: ['AL JUZGADO', 'HECHOS', 'FUNDAMENTOS DE DERECHO', 'SUPLICO']
    },
    'Derecho Penal y Procesal Penal': {
      header: 'DENUNCIA/QUERELLA PENAL',
      color: P['danger-600'],
      sections: ['AL JUZGADO', 'HECHOS', 'FUNDAMENTOS DE DERECHO', 'SUPLICO']
    },
    'Derecho Laboral (Jurisdicción Social)': {
      header: 'DEMANDA LABORAL',
      color: P['success-600'],
      sections: ['AL JUZGADO DE LO SOCIAL', 'HECHOS', 'FUNDAMENTOS DE DERECHO', 'SUPLICO']
    },
    'Derecho Constitucional': {
      header: 'RECURSO CONSTITUCIONAL',
      color: P['gold-700'],
      sections: ['AL TRIBUNAL CONSTITUCIONAL', 'HECHOS', 'FUNDAMENTOS DE DERECHO', 'SUPLICO']
    },
    'Derecho de Familia': {
      header: 'DEMANDA DE FAMILIA',
      color: P['warning-600'],
      sections: ['AL JUZGADO DE PRIMERA INSTANCIA', 'HECHOS', 'FUNDAMENTOS DE DERECHO', 'SUPLICO']
    },
    'Derecho Administrativo y Contencioso-Administrativo': {
      header: 'RECURSO ADMINISTRATIVO',
      color: P['info-600'],
      sections: ['AL TRIBUNAL', 'HECHOS', 'FUNDAMENTOS DE DERECHO', 'SUPLICO']
    },
    'Derecho Mercantil': {
      header: 'DEMANDA MERCANTIL',
      color: P['danger-700'],
      sections: ['AL JUZGADO DE LO MERCANTIL', 'HECHOS', 'FUNDAMENTOS DE DERECHO', 'SUPLICO']
    },
    'Recursos procesales transversales': {
      header: 'RECURSO PROCESAL',
      color: P['info-700'],
      sections: ['AL TRIBUNAL', 'HECHOS', 'FUNDAMENTOS DE DERECHO', 'SUPLICO']
    }
  };

  const template = templates[areaLegal as keyof typeof templates] || templates['Derecho Civil y Procesal Civil'];

  // Función helper para agregar texto
  const addText = (text: string, fontSize: number, isBold: boolean = false, color: string = P['neutral-900']) => {
    doc.setFontSize(fontSize);
    doc.setTextColor(color);
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    
    const lines = doc.splitTextToSize(text, pageWidth - 40);
    doc.text(lines, 20, yPosition);
    yPosition += lines.length * (fontSize * 0.4) + 5;
  };

  // Encabezado específico del área
  addText(template.header, 18, true, template.color);
  addText(tipoEscrito, 14, true, P['neutral-600']);
  addText(`Área: ${areaLegal}`, 12, false, P['neutral-600']);
  
  // Línea separadora
  doc.setDrawColor(template.color);
  doc.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 15;

  // Datos del cliente
  if (datosCliente) {
    addText('DATOS DE LAS PARTES', 14, true, template.color);
    yPosition += 5;
    
    Object.entries(datosCliente).forEach(([key, value]) => {
      if (value) {
        addText(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`, 10);
      }
    });
    yPosition += 10;
  }

  // Contenido del documento
  addText('DOCUMENTO LEGAL', 16, true, template.color);
  yPosition += 10;

  // Procesar el contenido
  const contentSections = content.split('\n\n');
  
  for (const section of contentSections) {
    if (section.trim()) {
      // Detectar secciones importantes
      const isHeader = template.sections.some(header => section.includes(header));
      
      if (isHeader) {
        addText(section, 12, true, template.color);
      } else {
        addText(section, 10);
      }
      yPosition += 5;
    }
  }

  // Pie de página
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(P['neutral-600']);
  doc.text('Generado por Avocat LegalTech - Plataforma de Documentos Legales', 20, pageHeight - 10);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - 40, pageHeight - 10);

  return doc;
};

// Función para generar PDF con formato específico por tipo de documento
export const generateDocumentTypePDF = (tipoEscrito: string, content: string, datosCliente?: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Configuración específica por tipo de documento
  const documentConfigs = {
    'Demanda': { color: P['info-600'], icon: '⚖️' },
    'Denuncia': { color: P['danger-600'], icon: '🚨' },
    'Recurso': { color: P['gold-700'], icon: '📋' },
    'Escrito': { color: P['success-600'], icon: '📝' },
    'Solicitud': { color: P['warning-600'], icon: '📄' }
  };

  const config = documentConfigs[Object.keys(documentConfigs).find(key => tipoEscrito.includes(key)) as keyof typeof documentConfigs] || documentConfigs['Escrito'];

  const addText = (text: string, fontSize: number, isBold: boolean = false, color: string = P['neutral-900']) => {
    doc.setFontSize(fontSize);
    doc.setTextColor(color);
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    
    const lines = doc.splitTextToSize(text, pageWidth - 40);
    doc.text(lines, 20, yPosition);
    yPosition += lines.length * (fontSize * 0.4) + 5;
  };

  // Encabezado con icono
  addText(`${config.icon} ${tipoEscrito.toUpperCase()}`, 18, true, config.color);
  addText('Documento Legal Profesional', 12, false, P['neutral-600']);
  
  // Línea decorativa
  doc.setDrawColor(config.color);
  doc.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 15;

  // Contenido
  addText('DOCUMENTO LEGAL', 16, true, config.color);
  yPosition += 10;

  const contentSections = content.split('\n\n');
  for (const section of contentSections) {
    if (section.trim()) {
      addText(section, 10);
      yPosition += 5;
    }
  }

  return doc;
};
