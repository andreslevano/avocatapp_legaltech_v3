import { db } from './firebase-admin';

/**
 * Verifica si un usuario es administrador
 * @param uid - ID del usuario
 * @returns true si es administrador, false en caso contrario
 */
export async function isAdmin(uid: string): Promise<boolean> {
  try {
    if (!uid) {
      console.log('❌ No UID provided');
      return false;
    }

    console.log(`🔍 Checking admin status for UID: ${uid}`);
    
    // For now, hardcode the admin UID to test the functionality
    // TODO: Replace with proper Firestore query once Firebase Admin is working
    const adminUIDs = [
      'jdwWMhOqVCggIRjLVBtxbvhOwPq1', // Your UID from the Firestore screenshot
      'demo_admin_user'
    ];
    
    const isAdminUser = adminUIDs.includes(uid);
    
    console.log(`🔐 Verificación de admin para ${uid}: result=${isAdminUser}`);
    return isAdminUser;

  } catch (error) {
    console.error('❌ Error verificando permisos de administrador:', error);
    return false;
  }
}

/**
 * Middleware para verificar permisos de administrador
 * @param request - Request de Next.js
 * @returns true si tiene permisos, false en caso contrario
 */
export async function requireAdmin(request: Request): Promise<{
  authorized: boolean;
  uid?: string;
  error?: string;
}> {
  try {
    // En un entorno real, aquí obtendrías el UID del token de autenticación
    // Por ahora, usamos un UID de demo para testing
    const uid = 'demo_admin_user'; // TODO: Obtener del token de autenticación real
    
    const isAdminUser = await isAdmin(uid);
    
    if (!isAdminUser) {
      return {
        authorized: false,
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      };
    }

    return {
      authorized: true,
      uid
    };

  } catch (error: any) {
    console.error('❌ Error en middleware de admin:', error);
    return {
      authorized: false,
      error: 'Error verificando permisos de administrador'
    };
  }
}

/**
 * Crea un usuario administrador en Firestore
 * @param uid - ID del usuario
 * @param email - Email del usuario
 * @param displayName - Nombre del usuario
 */
export async function createAdminUser(
  uid: string, 
  email: string, 
  displayName?: string
): Promise<void> {
  try {
    const adminData = {
      uid,
      email,
      displayName: displayName || 'Administrador',
      role: 'admin',
      isAdmin: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      permissions: {
        canViewUsers: true,
        canEditUsers: true,
        canViewAnalytics: true,
        canGenerateEmails: true,
        canSendEmails: true,
        canViewDocuments: true,
        canDeleteDocuments: true
      },
      stats: {
        totalDocuments: 0,
        totalGenerations: 0,
        totalSpent: 0
      }
    };

    await db().collection('users').doc(uid).set(adminData);
    console.log(`✅ Usuario administrador creado: ${email}`);

  } catch (error) {
    console.error('❌ Error creando usuario administrador:', error);
    throw error;
  }
}

/**
 * Obtiene la lista de administradores
 * @returns Lista de usuarios administradores
 */
export async function getAdminUsers(): Promise<any[]> {
  try {
    const snapshot = await db()
      .collection('users')
      .where('role', '==', 'admin')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

  } catch (error) {
    console.error('❌ Error obteniendo administradores:', error);
    return [];
  }
}

/**
 * Verifica si un endpoint requiere permisos de administrador
 * @param pathname - Ruta del endpoint
 * @returns true si requiere permisos de admin
 */
export function requiresAdminAccess(pathname: string): boolean {
  const adminPaths = [
    '/dashboard/administrador',
    '/api/admin/',
    '/api/analyze-pdf'
  ];

  return adminPaths.some(path => pathname.startsWith(path));
}

