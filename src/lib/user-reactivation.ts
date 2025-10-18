import { User } from 'firebase/auth';
import { reactivateUserAccount } from './user-management';

/**
 * Checks if a user needs reactivation and reactivates them if necessary
 * This should be called after successful login
 */
export async function handleUserReactivation(user: User): Promise<{
  wasReactivated: boolean;
  message?: string;
  error?: string;
}> {
  try {
    // Check if user is active in Firestore
    const response = await fetch(`/api/admin/user/status?uid=${user.uid}`);
    
    if (!response.ok) {
      console.warn('Could not check user status, assuming active');
      return { wasReactivated: false };
    }

    const result = await response.json();
    
    if (!result.success) {
      console.warn('Error checking user status:', result.error);
      return { wasReactivated: false };
    }

    // If user is already active, no need to reactivate
    if (result.isActive) {
      return { wasReactivated: false };
    }

    // User is inactive, reactivate them
    console.log(`🔄 Reactivating user: ${user.uid}`);
    const reactivationResult = await reactivateUserAccount(user);
    
    if (reactivationResult.success) {
      return {
        wasReactivated: true,
        message: 'Tu cuenta ha sido reactivada exitosamente.'
      };
    } else {
      return {
        wasReactivated: false,
        error: reactivationResult.error || 'Error al reactivar la cuenta'
      };
    }

  } catch (error) {
    console.error('Error during user reactivation:', error);
    return {
      wasReactivated: false,
      error: 'Error inesperado al verificar el estado de la cuenta'
    };
  }
}

/**
 * Checks if a user account is disabled in Firebase Auth
 */
export function isUserDisabled(user: User): boolean {
  // Note: Firebase Auth doesn't expose the disabled status directly to the client
  // This would need to be checked server-side or through a custom claim
  return false; // For now, we'll rely on Firestore isActive status
}
