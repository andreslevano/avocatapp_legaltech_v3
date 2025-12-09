import pino from 'pino';

// Configuración del logger simplificada
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

// Logger con contexto de request
export const createRequestLogger = (requestId: string) => {
  return logger.child({ requestId });
};

// Logger para API endpoints
export const apiLogger = {
  generateDocument: (requestId: string, data: any) => {
    const reqLogger = createRequestLogger(requestId);
    reqLogger.info({ 
      endpoint: 'generate-document',
      ...data 
    }, 'Document generation request');
  },
  
  error: (requestId: string, error: any, context?: any) => {
    const reqLogger = createRequestLogger(requestId);
    reqLogger.error({ 
      error: error.message,
      stack: error.stack,
      ...context 
    }, 'API Error');
  },
  
  success: (requestId: string, data: any) => {
    const reqLogger = createRequestLogger(requestId);
    reqLogger.info({ 
      ...data 
    }, 'API Success');
  }
};

export default logger;
