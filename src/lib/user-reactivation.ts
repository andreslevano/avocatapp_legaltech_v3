// Utility function to check if a user exists and is inactive
export async function checkUserStatus(email: string) {
  try {
    const response = await fetch(`/api/admin/user/check-status?email=${encodeURIComponent(email)}`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      return {
        exists: true,
        isActive: data.isActive,
        uid: data.uid
      };
    }
    
    return {
      exists: false,
      isActive: false,
      uid: null
    };
  } catch (error) {
    console.error('Error checking user status:', error);
    return {
      exists: false,
      isActive: false,
      uid: null
    };
  }
}

// Function to handle user reactivation during login
export async function handleUserReactivation(user: any) {
  try {
    // Check if user is inactive
    const userStatus = await checkUserStatus(user.email);
    
    if (userStatus.exists && !userStatus.isActive) {
      // Reactivate the user
      const result = await reactivateUserAccount(userStatus.uid!);
      
      if (result.success) {
        return {
          wasReactivated: true,
          message: 'Tu cuenta ha sido reactivada exitosamente.'
        };
      } else {
        return {
          wasReactivated: false,
          message: 'Error al reactivar tu cuenta.'
        };
      }
    }
    
    return {
      wasReactivated: false,
      message: null
    };
  } catch (error) {
    console.error('Error during user reactivation:', error);
    return {
      wasReactivated: false,
      message: 'Error al verificar el estado de tu cuenta.'
    };
  }
}

// Function to reactivate a user account
export async function reactivateUserAccount(uid: string) {
  try {
    const response = await fetch('/api/admin/user/reactivate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uid }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      return {
        success: true,
        message: data.message || 'Account reactivated successfully'
      };
    }
    
    return {
      success: false,
      message: data.error || 'Failed to reactivate account'
    };
  } catch (error) {
    console.error('Error reactivating account:', error);
    return {
      success: false,
      message: 'Network error while reactivating account'
    };
  }
}