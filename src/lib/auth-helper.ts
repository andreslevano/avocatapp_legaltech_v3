import { NextRequest } from 'next/server';
import { getAdmin } from './firebase-admin';
import { getAuth } from 'firebase-admin/auth';

export interface AuthResult {
  userId: string | null;
  error?: string;
}

/**
 * Obtiene el userId desde el token de autenticación en el header Authorization
 * @param request - Request de Next.js
 * @returns AuthResult con userId o null si no hay token válido
 */
export async function getUserIdFromAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { userId: null };
    }
    
    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      return { userId: null };
    }
    
    const admin = getAdmin();
    const auth = getAuth(admin);
    const decodedToken = await auth.verifyIdToken(token);
    
    return { userId: decodedToken.uid };
  } catch (error: any) {
    console.warn('⚠️ Error verificando token de autenticación:', error.message);
    return { 
      userId: null, 
      error: error.code === 'auth/id-token-expired' ? 'Token expirado' : 'Token inválido' 
    };
  }
}

/**
 * Obtiene el userId desde el token de autenticación o del body (solo en desarrollo)
 * @param request - Request de Next.js
 * @param bodyUserId - userId del body del request (solo usado en desarrollo)
 * @returns userId o null si no se puede obtener
 */
export async function getUserId(
  request: NextRequest,
  bodyUserId?: string
): Promise<string | null> {
  // Primero intentar obtener del token de autenticación
  const authResult = await getUserIdFromAuth(request);
  
  if (authResult.userId) {
    return authResult.userId;
  }
  
  // Si no hay token válido, en desarrollo permitir usar bodyUserId
  if (process.env.NODE_ENV !== 'production' && bodyUserId) {
    console.warn('⚠️ Usando bodyUserId como fallback (solo permitido en desarrollo)');
    return bodyUserId;
  }
  
  // En producción, si no hay token válido, retornar null
  return null;
}
