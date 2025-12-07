# Step-by-Step Guide: Fixing Purchase Generation Issue

## Problem Summary
Purchases are being created by a Cloud Run function (`autoGenerateStudentDocumentsOnPurchase`) instead of the Stripe webhook handler, causing timeouts and missing documents.

---

## PART 1: What I (AI) Will Do - Code Fixes

### Step 1.1: Add Webhook Logging and Error Handling ✅
**Status:** Will implement
- Add detailed logging to webhook handler
- Add error tracking for failed webhook processing
- Add retry logic for document generation failures

### Step 1.2: Add Purchase Validation ✅
**Status:** Will implement
- Ensure purchases are only created with Stripe session data
- Add validation to prevent duplicate purchases
- Add checks to ensure webhook is the only source of purchase creation

### Step 1.3: Add Webhook Status Endpoint ✅
**Status:** Will implement
- Create endpoint to check webhook health
- Add endpoint to manually trigger webhook processing for testing

---

## PART 2: What You (User) Should Do - Configuration & Verification

### Step 2.1: Verify Stripe Webhook Configuration

#### 2.1.1: Access Stripe Dashboard
1. Go to https://dashboard.stripe.com
2. Navigate to **Developers** → **Webhooks**
3. Find your webhook endpoint (should point to your domain)

#### 2.1.2: Check Webhook Endpoint URL
Your webhook should be configured as:
```
https://your-domain.com/api/stripe/webhook
```
Or for local testing:
```
https://your-ngrok-url.ngrok.io/api/stripe/webhook
```

#### 2.1.3: Verify Events Being Sent
The webhook should listen for:
- ✅ `checkout.session.completed` (REQUIRED)
- Optional: `payment_intent.succeeded`, `payment_intent.payment_failed`

#### 2.1.4: Get Webhook Signing Secret
1. Click on your webhook endpoint
2. Click **"Reveal"** next to "Signing secret"
3. Copy the secret (starts with `whsec_...`)
4. Save it to `.env.local` as `STRIPE_WEBHOOK_SECRET`

---

### Step 2.2: Configure Environment Variables

#### 2.2.1: Update `.env.local`
Add/verify these variables:
```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_... (or sk_test_...)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_...)
STRIPE_WEBHOOK_SECRET=whsec_... (from Step 2.1.4)

# Firebase Configuration (already set)
FIREBASE_PROJECT_ID=avocat-legaltech-v3
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_STORAGE_BUCKET=avocat-legaltech-v3.firebasestorage.app

# OpenAI Configuration (already set)
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o
```

#### 2.2.2: Update Production Environment Variables
If deploying to Vercel/other platform:
1. Go to your deployment platform's environment variables section
2. Add `STRIPE_WEBHOOK_SECRET` with the value from Step 2.1.4
3. Ensure all other Stripe variables are set

---

### Step 2.3: Disable or Modify Cloud Run Function

#### Option A: Disable the Cloud Run Function (Recommended)
1. Go to Google Cloud Console: https://console.cloud.google.com
2. Navigate to **Cloud Run** → **Functions**
3. Find `autoGenerateStudentDocumentsOnPurchase`
4. Click on it → **Edit**
5. **Disable the trigger** or **Delete the function**

**Why:** The webhook handler should be the ONLY source creating purchases. The Cloud Run function is causing conflicts.

#### Option B: Modify Cloud Run Function (If you need to keep it)
If you must keep the function, modify it to:
- Only process purchases that already have `stripeSessionId`
- Skip purchases without Stripe metadata
- Add a check: `if (!purchase.stripeSessionId) return;`

---

### Step 2.4: Test Webhook Locally (Optional but Recommended)

#### 2.4.1: Install Stripe CLI
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from: https://stripe.com/docs/stripe-cli
```

#### 2.4.2: Login to Stripe CLI
```bash
stripe login
```

#### 2.4.3: Forward Webhooks to Local Server
```bash
# In a separate terminal, run:
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will give you a webhook signing secret (different from production).

#### 2.4.4: Update `.env.local` for Local Testing
```bash
STRIPE_WEBHOOK_SECRET=whsec_... (from stripe listen output)
```

#### 2.4.5: Test with a Test Payment
```bash
# Trigger a test checkout session completion
stripe trigger checkout.session.completed
```

---

### Step 2.5: Verify Webhook is Working

#### 2.5.1: Check Stripe Dashboard Webhook Logs
1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Check **"Recent events"** tab
4. Look for `checkout.session.completed` events
5. Verify they show **"Succeeded"** status (green checkmark)

#### 2.5.2: Check Your Application Logs
- If using Vercel: Check **Deployments** → **Functions** → **Logs**
- If using other platform: Check your server logs
- Look for: `✅ Checkout session completed:` and `✅ Compra guardada en Firestore:`

#### 2.5.3: Make a Test Purchase
1. Add an item to cart
2. Complete payment in Stripe test mode
3. Check Firestore: Purchase should be created with:
   - `status: 'completed'`
   - `stripeSessionId: 'cs_...'`
   - `stripePaymentIntentId: 'pi_...'`
   - `items[].packageFiles` populated with documents

---

### Step 2.6: Monitor and Verify

#### 2.6.1: Check Purchase Creation Flow
After a successful payment, verify in Firestore:
```javascript
// Purchase should have:
{
  status: 'completed',  // ✅ Not 'pending'
  stripeSessionId: 'cs_...',  // ✅ Present
  stripePaymentIntentId: 'pi_...',  // ✅ Present
  items: [{
    packageFiles: {
      templatePdf: { downloadUrl: '...', storagePath: '...' },
      templateDocx: { downloadUrl: '...', storagePath: '...' },
      samplePdf: { downloadUrl: '...', storagePath: '...' },
      sampleDocx: { downloadUrl: '...', storagePath: '...' },
      studyMaterialPdf: { downloadUrl: '...', storagePath: '...' }
    },
    status: 'completed'  // ✅ Not 'pending'
  }],
  documentsGenerated: 1  // ✅ > 0
}
```

#### 2.6.2: Set Up Alerts (Optional)
- Set up monitoring for webhook failures
- Alert if purchases are created without `stripeSessionId`
- Monitor document generation success rate

---

## PART 3: Troubleshooting

### Issue: Webhook Not Receiving Events
**Symptoms:** Purchases not being created after payment

**Check:**
1. Webhook URL is correct and accessible
2. `STRIPE_WEBHOOK_SECRET` is set correctly
3. Webhook endpoint is not blocked by firewall
4. Check Stripe Dashboard → Webhooks → Recent events for errors

**Fix:**
- Verify webhook secret matches Stripe dashboard
- Test webhook endpoint manually
- Check server logs for errors

### Issue: Webhook Receiving Events But Not Processing
**Symptoms:** Events show "Succeeded" in Stripe but no purchase created

**Check:**
1. Server logs for webhook handler errors
2. Firebase Admin credentials are correct
3. OpenAI API key is valid
4. Check for timeout errors

**Fix:**
- Increase webhook timeout if needed
- Check Firebase permissions
- Verify all environment variables are set

### Issue: Purchases Created But No Documents
**Symptoms:** Purchase exists but `packageFiles` is empty

**Check:**
1. OpenAI API key is valid and has credits
2. Firebase Storage bucket is accessible
3. Check webhook logs for document generation errors

**Fix:**
- Run reprocess script: `npm run reprocess:purchase <purchaseId>`
- Check OpenAI API usage/limits
- Verify Firebase Storage permissions

---

## PART 4: Verification Checklist

After completing all steps, verify:

- [ ] `STRIPE_WEBHOOK_SECRET` is set in `.env.local` and production
- [ ] Stripe webhook endpoint is configured correctly
- [ ] Cloud Run function is disabled or modified
- [ ] Webhook events show "Succeeded" in Stripe dashboard
- [ ] Test purchase creates purchase with `stripeSessionId`
- [ ] Test purchase generates all 5 documents
- [ ] Purchase status is `completed` (not `pending`)
- [ ] Documents are accessible via download URLs

---

## Quick Reference Commands

```bash
# Test webhook locally
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test event
stripe trigger checkout.session.completed

# Reprocess a purchase manually
npm run reprocess:purchase <purchaseId>

# Check purchase status
npm run list:documents <purchaseId>
```

---

## Support

If issues persist:
1. Check Stripe Dashboard → Webhooks → Recent events
2. Check your deployment platform logs
3. Verify all environment variables are set
4. Test webhook endpoint manually with Stripe CLI


