import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Mock para las dependencias
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-123'
}));

jest.mock('@/lib/openai', () => ({
  generateDocument: jest.fn().mockResolvedValue({
    content: 'Documento generado de prueba',
    tokensUsed: 150,
    model: 'gpt-4o',
    elapsedMs: 2000
  })
}));

jest.mock('@/lib/ratelimit', () => ({
  checkRateLimit: jest.fn().mockReturnValue({
    allowed: true,
    remaining: 9,
    resetTime: Date.now() + 60000
  })
}));

describe('Generate Document API', () => {
  const baseUrl = 'http://localhost:3000';
  
  it('should generate document with valid payload', async () => {
    const payload = {
      areaLegal: 'Derecho Civil',
      tipoEscrito: 'Demanda de reclamación de cantidad',
      hechos: 'El demandado debe una cantidad de 1000 euros por servicios prestados',
      peticiones: 'Se solicita el pago de la cantidad adeudada más intereses',
      tono: 'formal',
      datosCliente: {
        nombre: 'Juan Pérez',
        dni: '12345678A'
      }
    };
    
    const response = await fetch(`${baseUrl}/api/generate-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id');
    expect(data.data).toHaveProperty('filename');
    expect(data.data).toHaveProperty('content');
    expect(data.data).toHaveProperty('tokensUsed');
    expect(data.data).toHaveProperty('model');
    expect(data.data).toHaveProperty('elapsedMs');
  });
  
  it('should return validation error for invalid payload', async () => {
    const invalidPayload = {
      areaLegal: '', // Inválido: vacío
      tipoEscrito: 'Demanda de reclamación de cantidad',
      hechos: 'Muy pocos hechos', // Inválido: menos de 10 caracteres
      peticiones: 'Pocas' // Inválido: menos de 5 caracteres
    };
    
    const response = await fetch(`${baseUrl}/api/generate-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidPayload)
    });
    
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(data.error).toHaveProperty('message');
    expect(data.error).toHaveProperty('hint');
  });
  
  it('should handle rate limiting', async () => {
    // Mock rate limit exceeded
    const { checkRateLimit } = require('@/lib/ratelimit');
    checkRateLimit.mockReturnValueOnce({
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000
    });
    
    const payload = {
      areaLegal: 'Derecho Civil',
      tipoEscrito: 'Demanda de reclamación de cantidad',
      hechos: 'El demandado debe una cantidad de 1000 euros por servicios prestados',
      peticiones: 'Se solicita el pago de la cantidad adeudada más intereses',
      tono: 'formal'
    };
    
    const response = await fetch(`${baseUrl}/api/generate-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    expect(response.status).toBe(429);
    
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toHaveProperty('code', 'RATE_LIMIT_EXCEEDED');
    expect(data.error).toHaveProperty('message');
    expect(data.error).toHaveProperty('hint');
  });
});
