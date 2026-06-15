# Webhook 400 Error Fix - Applied

## Issues Identified

1. **Webhook Secret Whitespace**: The webhook secret might contain leading/trailing whitespace or newlines, causing signature verification to fail.
2. **Body Parsing**: The request body might be getting parsed as JSON instead of remaining raw, which breaks Stripe's signature verification.

## Fixes Applied

### 1. Cloud Function (`functions/src/index.ts`)

- ✅ Added `.trim()` to webhook secret retrieval
- ✅ Added body type checking to detect if body was parsed as JSON
- ✅ Improved error logging to identify the exact issue
- ✅ Added validation to ensure body is Buffer or string before verification

### 2. Next.js Route Handler (`src/lib/stripe.ts`)

- ✅ Added `.trim()` to webhook secret
- ✅ Added validation to ensure payload is a string (not parsed object)

## Next Steps

### 1. Verify Webhook Secret in Firebase Functions

The webhook secret in Firebase Functions secrets might have whitespace. Check and update if needed:

```bash
# Check current secret (if accessible)
firebase functions:secrets:access STRIPE_WEBHOOK_SECRET

# If it has whitespace, update it:
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
# Paste the secret WITHOUT any leading/trailing spaces or newlines
```

### 2. Redeploy Cloud Function

After fixing the secret (if needed), redeploy the function:

```bash
cd functions
npm run build
firebase deploy --only functions:stripeWebhook
```

### 3. Verify Webhook URL in Stripe Dashboard

Ensure the webhook URL points **directly** to the Cloud Function URL:
- ✅ Correct: `https://stripewebhook-xph64x4ova-uc.a.run.app`
- ❌ Wrong: `https://avocat-legaltech-v3.web.app/api/stripe/webhook` (goes through Firebase Hosting, which parses JSON)

### 4. Test the Webhook

1. Make a test purchase
2. Check Stripe Dashboard → Webhooks → Recent Events
3. Verify the webhook succeeds (200 status instead of 400)
4. Check Cloud Function logs for detailed error messages if it still fails

## Expected Behavior After Fix

- ✅ Webhook receives raw body as Buffer
- ✅ Webhook secret is trimmed before use
- ✅ Signature verification succeeds
- ✅ Purchase documents are generated automatically
- ✅ Purchase status is updated to `completed`

## Troubleshooting

If the error persists:

1. **Check Cloud Function Logs**:
   ```bash
   firebase functions:log --only stripeWebhook
   ```
   Look for:
   - Body type (should be "object" with Buffer.isBuffer = true)
   - Body length
   - Any error messages about parsed objects

2. **Verify Secret Format**:
   - Should start with `whsec_`
   - No leading/trailing spaces
   - No newlines

3. **Test Webhook Locally** (if needed):
   ```bash
   stripe listen --forward-to localhost:5001/avocat-legaltech-v3/us-central1/stripeWebhook
   ```

## Code Changes Summary

### `functions/src/index.ts`
- Line 1627: Added `.trim()` to `stripeSecretKey.value()`
- Lines 1631-1655: Added body type checking and validation
- Line 1658: Added `.trim()` to `stripeWebhookSecret.value()`
- Lines 1665-1668: Improved error logging

### `src/lib/stripe.ts`
- Line 593: Added `.trim()` to webhook secret
- Lines 595-598: Added payload type validation

