# 🔧 Fix: Firebase Function debe devolver PDF válido

## 🚨 Problema

La Firebase Function `reclamacionCantidades` está devolviendo **HTML** en lugar de un **PDF válido**, causando el error:
```
PDF Error: File not in PDF format or corrupted
```

## ✅ Solución Requerida

La Firebase Function `reclamacionCantidades` debe:

1. **Generar un PDF** usando `pdfkit` o `pdf-parse`
2. **Devolver el PDF** con headers correctos
3. **Content-Type**: `application/pdf`
4. **Body**: Buffer del PDF (no JSON, no HTML)

## 📋 Código Requerido en la Firebase Function

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import PDFDocument from 'pdfkit';

export const reclamacionCantidades = functions.https.onRequest(async (req, res) => {
  try {
    // Validar método
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Obtener datos del request
    const {
      nombreTrabajador,
      dniTrabajador,
      domicilioTrabajador,
      telefonoTrabajador,
      nombreEmpresa,
      cifEmpresa,
      domicilioEmpresa,
      cantidadesAdeudadas,
      cantidadTotal,
      // ... otros campos
    } = req.body;

    // Validar campos requeridos
    if (!nombreTrabajador || !dniTrabajador || !cantidadesAdeudadas) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generar PDF
    const pdfBuffer = await generateReclamacionPDF({
      nombreTrabajador,
      dniTrabajador,
      domicilioTrabajador,
      telefonoTrabajador,
      nombreEmpresa,
      cifEmpresa,
      domicilioEmpresa,
      cantidadesAdeudadas,
      cantidadTotal,
      // ... otros campos
    });

    // Configurar headers para PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reclamacion-cantidades-${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());

    // Enviar PDF
    res.send(pdfBuffer);

  } catch (error: any) {
    console.error('Error generando PDF:', error);
    res.status(500).json({ error: error.message || 'Error generando PDF' });
  }
});

async function generateReclamacionPDF(data: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      // Encabezado
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('AL TRIBUNAL DE INSTANCIA, SECCIÓN SOCIAL QUE POR TURNO CORRESPONDA', { align: 'center' });
      doc.moveDown(2);

      // Datos del demandante
      doc.fontSize(11).font('Helvetica');
      doc.text(`D./Dña. ${data.nombreTrabajador}`, { align: 'left' });
      doc.text(`DNI: ${data.dniTrabajador}`, { align: 'left' });
      doc.text(`Domicilio: ${data.domicilioTrabajador}`, { align: 'left' });
      doc.text(`Teléfono: ${data.telefonoTrabajador}`, { align: 'left' });
      doc.moveDown(2);

      // Datos del demandado
      doc.fontSize(11).font('Helvetica-Bold');
      doc.text('EXPONE:', { align: 'left' });
      doc.moveDown();
      doc.font('Helvetica');
      doc.text(`Que mediante el presente escrito, comparece ante este Tribunal para ejercitar acción de reclamación de cantidades adeudadas contra ${data.nombreEmpresa}...`);
      doc.moveDown(2);

      // Cantidades adeudadas
      doc.font('Helvetica-Bold');
      doc.text('CANTIDADES ADEUDADAS:', { align: 'left' });
      doc.moveDown();
      doc.font('Helvetica');
      data.cantidadesAdeudadas.forEach((cantidad: string) => {
        doc.text(`• ${cantidad}`, { align: 'left' });
      });
      doc.moveDown(2);

      // Total
      doc.font('Helvetica-Bold');
      doc.text(`TOTAL ADEUDADO: ${data.cantidadTotal}`, { align: 'right' });
      doc.moveDown(3);

      // Firma
      doc.text('_________________________', { align: 'center' });
      doc.text('Firma', { align: 'center' });

      // Finalizar PDF
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}
```

## 🔍 Verificación

Después de actualizar la función, verifica:

1. **Headers correctos**:
   ```bash
   curl -I https://reclamacioncantidades-xph64x4ova-uc.a.run.app
   ```

2. **Content-Type debe ser**: `application/pdf`

3. **Primeros bytes del archivo deben ser**: `%PDF`

## 📝 Notas Importantes

- **NO devolver JSON** cuando se solicita un PDF
- **NO devolver HTML** (páginas de error)
- **Siempre devolver Buffer** del PDF directamente
- **Content-Type debe ser `application/pdf`**

## 🚀 Despliegue

Después de actualizar la función:

```bash
firebase deploy --only functions:reclamacionCantidades
```

## ✅ Prueba

Una vez desplegada, prueba con:

```bash
curl -X POST https://reclamacioncantidades-xph64x4ova-uc.a.run.app \
  -H "Content-Type: application/json" \
  -d '{
    "nombreTrabajador": "María García López",
    "dniTrabajador": "12345678A",
    "cantidadesAdeudadas": ["Salarios: 3000 euros"],
    "cantidadTotal": "3000 euros"
  }' \
  --output test.pdf

# Verificar que es un PDF válido
file test.pdf
# Debe mostrar: test.pdf: PDF document
```

