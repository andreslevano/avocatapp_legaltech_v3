import { auth } from './firebase';
import { db } from './firebase-admin';
import { User } from 'firebase/auth';

export interface UserDeactivationResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface UserReactivationResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Deactivates a user account by disabling authentication and cleaning up Firestore data
 */
export async function deactivateUserAccount(user: User): Promise<UserDeactivationResult> {
  try {
    const uid = user.uid;
    
    // Step 1: Disable user in Firebase Authentication
    await disableUserInAuth(uid);
    
    // Step 2: Clean up Firestore data
    await cleanupUserData(uid);
    
    // Step 3: Update user document to set isActive = false
    await updateUserStatus(uid, false);
    
    return {
      success: true,
      message: 'Cuenta desactivada exitosamente. Todos tus datos han sido eliminados.'
    };
    
  } catch (error) {
    console.error('Error deactivating user:', error);
    return {
      success: false,
      message: 'Error al desactivar la cuenta',
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Reactivates a user account by enabling authentication and setting isActive = true
 */
export async function reactivateUserAccount(user: User): Promise<UserReactivationResult> {
  try {
    const uid = user.uid;
    
    // Step 1: Enable user in Firebase Authentication
    await enableUserInAuth(uid);
    
    // Step 2: Update user document to set isActive = true
    await updateUserStatus(uid, true);
    
    return {
      success: true,
      message: 'Cuenta reactivada exitosamente.'
    };
    
  } catch (error) {
    console.error('Error reactivating user:', error);
    return {
      success: false,
      message: 'Error al reactivar la cuenta',
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Disables user in Firebase Authentication
 */
async function disableUserInAuth(uid: string): Promise<void> {
  try {
    // Call our API endpoint to disable the user
    const response = await fetch('/api/admin/user/disable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uid }),
    });

    if (!response.ok) {
      throw new Error('Failed to disable user in authentication service');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to disable user');
    }
  } catch (error) {
    console.error('Error disabling user in auth:', error);
    throw error;
  }
}

/**
 * Enables user in Firebase Authentication
 */
async function enableUserInAuth(uid: string): Promise<void> {
  try {
    // Call our API endpoint to enable the user
    const response = await fetch('/api/admin/user/enable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uid }),
    });

    if (!response.ok) {
      throw new Error('Failed to enable user in authentication service');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to enable user');
    }
  } catch (error) {
    console.error('Error enabling user in auth:', error);
    throw error;
  }
}

/**
 * Cleans up all user data from Firestore collections except 'users'
 */
async function cleanupUserData(uid: string): Promise<void> {
  try {
    // Call our API endpoint to clean up user data
    const response = await fetch('/api/admin/user/cleanup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uid }),
    });

    if (!response.ok) {
      throw new Error('Failed to cleanup user data');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to cleanup user data');
    }
  } catch (error) {
    console.error('Error cleaning up user data:', error);
    throw error;
  }
}

/**
 * Updates user status in Firestore
 */
async function updateUserStatus(uid: string, isActive: boolean): Promise<void> {
  try {
    // Call our API endpoint to update user status
    const response = await fetch('/api/admin/user/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uid, isActive }),
    });

    if (!response.ok) {
      throw new Error('Failed to update user status');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to update user status');
    }
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
}

/**
 * Checks if user account is active
 */
export async function isUserActive(user: User): Promise<boolean> {
  try {
    const response = await fetch(`/api/admin/user/status?uid=${user.uid}`);
    
    if (!response.ok) {
      // If endpoint doesn't exist (404) or other error, default to active
      return true;
    }

    // Check if response is actually JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Response is not JSON (likely HTML error page), default to active
      return true;
    }

    const result = await response.json();
    return result.isActive === true;
  } catch (error) {
    // Silently handle errors - don't break auth flow
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Error checking user status (non-critical):', error);
    }
    return true; // Default to active if we can't check
  }
}
