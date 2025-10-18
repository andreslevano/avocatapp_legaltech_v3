# User Management System Implementation

## Overview

This document describes the implementation of the user account deactivation and reactivation system for Avocat LegalTech v3. The system allows users to deactivate their accounts, which disables authentication and cleans up all associated data, while preserving the ability to reactivate the account later.

## Architecture

### 1. User Deactivation Flow

When a user chooses to deactivate their account:

1. **Firebase Authentication**: User is disabled in Firebase Auth (not deleted)
2. **Firestore Cleanup**: All user data is deleted from Firestore collections except `users`
3. **User Status Update**: The user document in `users` collection is updated with `isActive: false`

### 2. User Reactivation Flow

When a previously deactivated user logs in:

1. **Status Check**: System checks if user has `isActive: false` in Firestore
2. **Firebase Auth**: User is re-enabled in Firebase Authentication
3. **Status Update**: User document is updated with `isActive: true`

## File Structure

```
src/
├── lib/
│   ├── user-management.ts          # Main user management utilities
│   └── user-reactivation.ts        # Login-time reactivation logic
├── components/
│   └── AccountDeactivationModal.tsx # Deactivation confirmation dialog
├── app/
│   ├── api/admin/user/
│   │   ├── disable/route.ts         # Disable user in Firebase Auth
│   │   ├── enable/route.ts          # Enable user in Firebase Auth
│   │   ├── cleanup/route.ts         # Clean up user Firestore data
│   │   ├── update-status/route.ts   # Update user status in Firestore
│   │   └── status/route.ts          # Check user status
│   └── login/page.tsx               # Login with reactivation logic
└── components/UserMenu.tsx          # Updated with deactivation option
```

## API Endpoints

### POST /api/admin/user/disable
Disables a user in Firebase Authentication.

**Request:**
```json
{
  "uid": "user-uid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User disabled successfully"
}
```

### POST /api/admin/user/enable
Enables a user in Firebase Authentication.

**Request:**
```json
{
  "uid": "user-uid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User enabled successfully"
}
```

### POST /api/admin/user/cleanup
Deletes all user data from Firestore collections except `users`.

**Request:**
```json
{
  "uid": "user-uid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User data cleaned up successfully. X documents deleted.",
  "deletedCount": 42
}
```

### POST /api/admin/user/update-status
Updates the user's `isActive` status in Firestore.

**Request:**
```json
{
  "uid": "user-uid",
  "isActive": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "User status updated to inactive"
}
```

### GET /api/admin/user/status?uid=user-uid
Checks the user's current status.

**Response:**
```json
{
  "success": true,
  "isActive": false,
  "userData": {
    "email": "user@example.com",
    "displayName": "User Name",
    "isActive": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Components

### AccountDeactivationModal

A comprehensive confirmation dialog that:

- Shows a clear warning about data deletion
- Lists all data that will be deleted
- Requires explicit confirmation text input
- Includes a checkbox confirmation
- Handles the deactivation process
- Shows loading states and error messages

### UserMenu

Updated to include:

- "Desactivar cuenta" option in the account section
- Integration with the deactivation modal
- Proper state management for the modal

### Login Page

Enhanced with:

- Automatic reactivation detection
- Reactivation success messages
- Proper error handling for reactivation failures

## Data Collections Cleaned Up

The cleanup process removes user data from these Firestore collections:

- `reclamaciones`
- `tutelas`
- `legal_audits`
- `document_generation_history`
- `user_analytics`
- `email_reports`
- `purchase_history`
- `document_templates`

**Note:** The `users` collection is preserved and only updated with `isActive: false`.

## Security Considerations

1. **Authentication Required**: All API endpoints require proper authentication
2. **User Ownership**: Users can only deactivate their own accounts
3. **Admin Access**: Admin endpoints are protected and should only be called from authenticated contexts
4. **Data Privacy**: Complete data deletion ensures GDPR compliance
5. **Reversible Process**: Account deactivation is reversible through the login flow

## Usage Examples

### Deactivating a User Account

```typescript
import { deactivateUserAccount } from '@/lib/user-management';
import { User } from 'firebase/auth';

const handleDeactivation = async (user: User) => {
  const result = await deactivateUserAccount(user);
  
  if (result.success) {
    console.log('Account deactivated successfully');
    // Sign out user and redirect
  } else {
    console.error('Deactivation failed:', result.error);
  }
};
```

### Checking User Status

```typescript
import { isUserActive } from '@/lib/user-management';

const checkStatus = async (user: User) => {
  const active = await isUserActive(user);
  console.log('User is active:', active);
};
```

### Login with Reactivation

The login process automatically handles reactivation:

```typescript
import { handleUserReactivation } from '@/lib/user-reactivation';

const handleLogin = async (user: User) => {
  const result = await handleUserReactivation(user);
  
  if (result.wasReactivated) {
    console.log('Account was reactivated:', result.message);
  }
};
```

## Testing

Use the provided test script to verify API endpoints:

```bash
node test-user-management.js
```

## Error Handling

The system includes comprehensive error handling:

- Network failures are caught and reported
- Firebase Auth errors are properly handled
- Firestore operation failures are logged
- User-friendly error messages are displayed
- Graceful fallbacks ensure the system remains functional

## Future Enhancements

Potential improvements for the system:

1. **Audit Logging**: Track all deactivation/reactivation events
2. **Data Export**: Allow users to export their data before deactivation
3. **Scheduled Deletion**: Implement automatic permanent deletion after a grace period
4. **Admin Dashboard**: Interface for administrators to manage user accounts
5. **Notification System**: Email notifications for deactivation/reactivation events
6. **Batch Operations**: Support for bulk user management operations

## Deployment Notes

1. Ensure Firebase Admin SDK is properly configured
2. Verify all API endpoints are accessible
3. Test the complete deactivation/reactivation flow
4. Monitor logs for any errors during deployment
5. Update environment variables if needed

## Troubleshooting

### Common Issues

1. **Firebase Auth Permission Errors**: Ensure service account has proper permissions
2. **Firestore Permission Errors**: Verify Firestore security rules
3. **CORS Issues**: Check API endpoint CORS configuration
4. **Network Timeouts**: Implement retry logic for critical operations

### Debug Mode

Enable debug logging by setting:
```javascript
console.log('Debug mode enabled for user management');
```

## Compliance

This implementation ensures:

- **GDPR Compliance**: Complete data deletion capability
- **Data Privacy**: No data retention after deactivation
- **User Control**: Users have full control over their data
- **Transparency**: Clear communication about data handling
