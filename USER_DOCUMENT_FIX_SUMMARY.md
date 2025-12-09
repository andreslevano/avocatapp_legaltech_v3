# User Document Missing Issue - Fix Summary

## Problem Description

**User UID:** `jsEA1hxG6SZGuTfivccpBzGQ2uD2`

**Issue:** User exists in Firebase Authentication but NOT in Firestore `users` collection, causing:
- Payment was successful ✅
- Documents could not be generated ❌
- Purchase process blocked ❌

## Root Cause Analysis

### 1. Signup Flow Issue
**File:** `src/app/signup/page.tsx` (lines 147-148)

The signup process was explicitly skipping Firestore user document creation:
```typescript
// Skip Firestore for now to ensure navigation works
console.log('Account created successfully, skipping Firestore for now');
```

**Impact:**
- User created in Firebase Authentication ✅
- User document NOT created in Firestore `users` collection ❌

### 2. Webhook Processing Issue
**File:** `src/lib/stripe.ts` (lines 306-331)

When the Stripe webhook processes a payment:
1. Tries to find user by `userId` from metadata
2. If not found, tries to find by email in Firestore `users` collection
3. If user document doesn't exist → sets `userId = 'unknown'`
4. Purchase created with `userId: 'unknown'`
5. Documents generated but stored under `users/unknown/documents/...`
6. Frontend queries purchases by `user.uid` but can't find them (they're under `unknown`)

## Solution Implemented

### Fix 1: Signup Page - Create User Document
**File:** `src/app/signup/page.tsx`

**Changes:**
- Added Firestore imports (`db`, `doc`, `setDoc`, `serverTimestamp`)
- After successful Firebase Auth user creation, now creates user document in Firestore
- Includes all required fields: `uid`, `email`, `displayName`, `isAdmin`, `isActive`, `role`, `subscription`, `preferences`, `stats`
- Error handling: If Firestore creation fails, logs error but doesn't block navigation (webhook will create it as fallback)

### Fix 2: Webhook Handler - Fallback User Creation
**File:** `src/lib/stripe.ts`

**Changes:**
- Added Firebase Admin Auth import (`getAuth`)
- Enhanced user lookup logic:
  1. First: Check Firestore `users` collection by email
  2. If not found: Check Firebase Auth by email
  3. If found in Auth but not Firestore: Create user document automatically
  4. Only set `userId = 'unknown'` if user doesn't exist in Auth either

**Benefits:**
- Automatically fixes missing user documents during payment processing
- Prevents future purchases from being assigned to `unknown`
- No manual intervention needed for future cases

### Fix 3: Recovery Script
**File:** `scripts/fix-missing-user.ts`

**Purpose:** One-time script to fix the affected user and any orphaned purchases

**Usage:**
```bash
npx ts-node scripts/fix-missing-user.ts jsEA1hxG6SZGuTfivccpBzGQ2uD2
```

**What it does:**
1. Checks if user document exists in Firestore
2. Gets user data from Firebase Auth
3. Creates user document in Firestore with proper structure
4. Finds any purchases with `userId = 'unknown'` for this user's email
5. Updates those purchases to use the correct `userId`

## Process Flow (After Fixes)

### New User Signup:
1. User fills signup form
2. `createUserWithEmailAndPassword()` creates user in Firebase Auth
3. **NEW:** User document created in Firestore `users` collection
4. User redirected to dashboard

### Payment Processing (Webhook):
1. Stripe sends `checkout.session.completed` event
2. Webhook handler receives event
3. Looks up user by email in Firestore
4. **If not found:** Looks up in Firebase Auth and creates Firestore document (fallback)
5. Creates purchase with correct `userId`
6. Generates documents and stores under `users/{userId}/documents/...`
7. Frontend can now find purchases and documents

## Immediate Action Required

### For the Affected User (`jsEA1hxG6SZGuTfivccpBzGQ2uD2`):

**Option 1: Run the recovery script** (Recommended)
```bash
cd /path/to/project
npx ts-node scripts/fix-missing-user.ts jsEA1hxG6SZGuTfivccpBzGQ2uD2
```

**Option 2: Manual Fix via Firebase Console**
1. Go to Firebase Console → Authentication
2. Find user with UID: `jsEA1hxG6SZGuTfivccpBzGQ2uD2`
3. Note the email address
4. Go to Firestore Database → `users` collection
5. Create new document with ID: `jsEA1hxG6SZGuTfivccpBzGQ2uD2`
6. Add fields:
   - `uid`: `jsEA1hxG6SZGuTfivccpBzGQ2uD2`
   - `email`: (from Auth)
   - `displayName`: (from Auth or email prefix)
   - `isAdmin`: `false`
   - `isActive`: `true`
   - `role`: `user`
   - `createdAt`: (from Auth metadata)
   - `lastLoginAt`: (from Auth metadata)
   - `subscription`: `{ plan: 'free', startDate: ..., isActive: true }`
   - `preferences`: `{ language: 'es', notifications: true, theme: 'light' }`
   - `stats`: `{ totalDocuments: 0, totalGenerations: 0, totalSpent: 0 }`

**Option 3: Wait for Next Payment**
- The webhook will automatically create the user document on the next payment
- But existing purchases will still be under `unknown`

### For Orphaned Purchases:

After creating the user document, check for purchases with `userId = 'unknown'`:
1. Go to Firestore → `purchases` collection
2. Filter by `userId == 'unknown'` AND `customerEmail == [user's email]`
3. Update those purchases to use the correct `userId`

The recovery script does this automatically.

## Testing

### Test Signup Flow:
1. Create a new test account
2. Verify user document is created in Firestore
3. Check that document has all required fields

### Test Payment Flow:
1. Make a test purchase with the new account
2. Verify webhook processes correctly
3. Verify purchase has correct `userId`
4. Verify documents are generated and stored correctly

### Test Fallback:
1. Manually delete a user document from Firestore (keep Auth user)
2. Make a purchase
3. Verify webhook creates the user document automatically

## Prevention

The fixes ensure:
1. ✅ New signups automatically create Firestore user documents
2. ✅ Webhook has fallback to create missing user documents
3. ✅ No future purchases will be assigned to `unknown`

## Files Modified

1. `src/app/signup/page.tsx` - Added Firestore user document creation
2. `src/lib/stripe.ts` - Added fallback user creation in webhook
3. `scripts/fix-missing-user.ts` - Recovery script for affected users

## Related Issues

- Console error: "User document not found in Firestore for UID: jsEA1hxG6SZGuTfivccpBzGQ2uD2"
- Payment successful but documents not generated
- Purchases not appearing in user dashboard


