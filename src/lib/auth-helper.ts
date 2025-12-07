import { NextRequest } from 'next/server';
import { getAdmin } from './firebase-admin';
import { getAuth } from 'firebase-admin/auth';

export interface AuthResult {
  userId: string | null;
  error?: string;
}

/**
 * Obtiene el userId del token de autenticación en el header Authorization
 * @param request - Request de Next.js
 * @returns userId si el token es válido, null si no hay token o es inválido
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
    // Token inválido, expirado, etc.
    console.warn('⚠️ Error verificando token de autenticación:', error.message);
    return { 
      userId: null, 
      error: error.code === 'auth/id-token-expired' 
        ? 'Token expirado' 
        : 'Token inválido' 
    };
  }
}

/**
 * Obtiene userId del token o del body (fallback solo en desarrollo)
 * 
 * SEGURIDAD:
 * - En producción: SOLO acepta userId del token de autenticación
 * - En desarrollo: permite fallback a bodyUserId para facilitar testing
 * 
 * @param request - Request de Next.js
 * @param bodyUserId - userId del body (solo usado en desarrollo)
 * @returns userId si se encuentra, null si no hay token válido
 */
export async function getUserId(
  request: NextRequest,
  bodyUserId?: string
): Promise<string | null> {
  // 1) Intentar SIEMPRE desde el token (comportamiento normal en producción)
  const authResult = await getUserIdFromAuth(request);
  if (authResult.userId) {
    return authResult.userId;
  }

  // 2) Solo en desarrollo permitimos bodyUserId como fallback
  if (process.env.NODE_ENV !== 'production' && bodyUserId) {
    console.warn('⚠️ Usando bodyUserId como fallback (solo permitido en desarrollo)');
    return bodyUserId;
  }

  // 3) En producción, si no hay token válido, devolvemos null
  return null;
}

