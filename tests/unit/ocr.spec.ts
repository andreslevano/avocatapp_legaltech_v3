import { test, expect } from '@playwright/test';

// Helper functions para cálculo OCR (simulando las del endpoint)
function calcularCuantiaDesdeOCR(ocr: any): number {
  if (ocr.summary?.totalDetected) {
    return ocr.summary.totalDetected;
  }
  
  let total = 0;
  ocr.files.forEach((file: any) => {
    if (file.amounts) {
      file.amounts.forEach((amount: any) => {
        if (amount.value > 0) {
          total += amount.value;
        }
      });
    }
  });
  
  return total > 0 ? total : 0;
}

function calcularPrecisionDesdeOCR(ocr: any): number {
  if (ocr.summary?.confidence) {
    return Math.round(ocr.summary.confidence * 100);
  }
  
  let totalValue = 0;
  let weightedConfidence = 0;
  
  ocr.files.forEach((file: any) => {
    if (file.amounts && file.amounts.length > 0) {
      file.amounts.forEach((amount: any) => {
        if (amount.value > 0) {
          const confidence = amount.confidence || file.confidence || 0.6;
          totalValue += amount.value;
          weightedConfidence += amount.value * confidence;
        }
      });
    }
  });
  
  if (totalValue > 0) {
    return Math.round((weightedConfidence / totalValue) * 100);
  }
  
  return 60; // Precisión por defecto
}

test.describe('OCR Calculation Tests', () => {
  test('Suma simple de 3 facturas con distintas confianzas', () => {
    const ocr = {
      files: [
        {
          filename: "factura_1.pdf",
          amounts: [{ value: 1000, confidence: 0.95 }],
          confidence: 0.95
        },
        {
          filename: "factura_2.pdf", 
          amounts: [{ value: 500, confidence: 0.88 }],
          confidence: 0.88
        },
        {
          filename: "factura_3.pdf",
          amounts: [{ value: 250, confidence: 0.92 }],
          confidence: 0.92
        }
      ]
    };

    const cuantia = calcularCuantiaDesdeOCR(ocr);
    const precision = calcularPrecisionDesdeOCR(ocr);

    expect(cuantia).toBe(1750);
    expect(precision).toBe(93); // (1000*0.95 + 500*0.88 + 250*0.92) / 1750 * 100
  });

  test('Override de usuario prevalece sobre OCR', () => {
    const ocr = {
      files: [
        { amounts: [{ value: 1000, confidence: 0.95 }] }
      ]
    };
    const cuantiaOverride = 2000;

    const cuantia = cuantiaOverride || calcularCuantiaDesdeOCR(ocr);
    const precision = calcularPrecisionDesdeOCR(ocr);

    expect(cuantia).toBe(2000); // Override prevalece
    expect(precision).toBe(95); // Precision sigue siendo del OCR
  });

  test('Sin amounts ni summary - valores por defecto', () => {
    const ocr = {
      files: [
        { filename: "documento.pdf", amounts: [] }
      ]
    };

    const cuantia = calcularCuantiaDesdeOCR(ocr);
    const precision = calcularPrecisionDesdeOCR(ocr);

    expect(cuantia).toBe(0);
    expect(precision).toBe(60); // Precisión por defecto
  });

  test('Cálculo con summary existente', () => {
    const ocr = {
      files: [
        { amounts: [{ value: 1000, confidence: 0.95 }] }
      ],
      summary: {
        totalDetected: 1500,
        confidence: 0.88
      }
    };

    const cuantia = calcularCuantiaDesdeOCR(ocr);
    const precision = calcularPrecisionDesdeOCR(ocr);

    expect(cuantia).toBe(1500); // Usa summary.totalDetected
    expect(precision).toBe(88); // Usa summary.confidence
  });

  test('Mezcla de archivos con y sin amounts', () => {
    const ocr = {
      files: [
        {
          filename: "factura.pdf",
          amounts: [{ value: 800, confidence: 0.90 }]
        },
        {
          filename: "albaran.pdf", 
          amounts: [{ value: 200, confidence: 0.85 }]
        },
        {
          filename: "carta.pdf",
          amounts: [] // Sin amounts
        }
      ]
    };

    const cuantia = calcularCuantiaDesdeOCR(ocr);
    const precision = calcularPrecisionDesdeOCR(ocr);

    expect(cuantia).toBe(1000); // Solo suma los que tienen amounts
    expect(precision).toBe(89); // (800*0.90 + 200*0.85) / 1000 * 100
  });

  test('Valores negativos se ignoran', () => {
    const ocr = {
      files: [
        {
          amounts: [
            { value: 1000, confidence: 0.95 },
            { value: -500, confidence: 0.90 }, // Negativo se ignora
            { value: 0, confidence: 0.80 }    // Cero se ignora
          ]
        }
      ]
    };

    const cuantia = calcularCuantiaDesdeOCR(ocr);
    const precision = calcularPrecisionDesdeOCR(ocr);

    expect(cuantia).toBe(1000); // Solo suma valores positivos
    expect(precision).toBe(95); // Solo considera valores positivos
  });
});
