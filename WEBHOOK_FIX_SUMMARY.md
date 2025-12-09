# Webhook Fix Summary

## ✅ Completed Tasks

### 1. Documents Generated for Missing Purchases
All three purchases have been successfully processed and documents generated:

- ✅ **Dzg8PfVlccU1cEvJjj5H** - Medidas cautelares en vía contenciosa
  - Template (PDF + Word)
  - Sample (PDF + Word)  
  - Study Material (PDF)

- ✅ **BlshhPkuKIgQcTVYIFHx** - Demanda de reclamación de cantidad
  - Template (PDF + Word)
  - Sample (PDF + Word)
  - Study Material (PDF)

- ✅ **M6zNSQ69yCu11y4I6AAc** - Demanda de reclamación de cantidad
  - Template (PDF + Word)
  - Sample (PDF + Word)
  - Study Material (PDF)

### 2. Webhook Function Updated
- ✅ Added Express with `express.raw()` middleware to capture raw request body
- ✅ Updated function to properly handle raw body for Stripe signature verification
- ✅ Deployed updated function to Firebase

## ⚠️ Critical Issue: Firebase Hosting Rewrites

**Problem**: Firebase Hosting rewrites parse JSON requests before forwarding them to Cloud Functions. This breaks Stripe's signature verification because it requires the exact raw request body.

**Solution**: Point Stripe webhook **directly to the Cloud Function URL** instead of going through Firebase Hosting.

## 🔧 Required Action

### Update Stripe Webhook URL

1. Go to Stripe Dashboard → Webhooks
2. Edit your webhook endpoint
3. Change the URL from:
   ```
   https://avocat-legaltech-v3.web.app/api/stripe/webhook
   ```
   To:
   ```
   https://stripewebhook-xph64x4ova-uc.a.run.app
   ```

### Why This Works

- Cloud Function URL receives the raw request body directly from Stripe
- No JSON parsing happens before the function receives it
- Express `raw()` middleware can properly capture the body for signature verification
- Signature verification will succeed

## 📊 Current Status

- ✅ Webhook function updated with Express raw body parser
- ✅ Function deployed successfully
- ✅ Documents generated for all missing purchases
- ⚠️ **Action Required**: Update Stripe webhook URL to use Cloud Function URL directly

## 🧪 Testing

After updating the webhook URL:
1. Make a test purchase
2. Check Stripe Dashboard → Webhooks → Recent Events
3. Verify the webhook succeeds (200 status instead of 400)
4. Confirm documents are generated automatically

## 📝 Technical Details

### What Changed

**Before:**
```typescript
export const stripeWebhook = functions.https.onRequest({
  secrets: [stripeSecretKey, stripeWebhookSecret]
}, async (req, res) => {
  const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
  // This failed because Firebase Hosting parsed JSON before forwarding
});
```

**After:**
```typescript
const webhookApp = express.default();
webhookApp.use(express.raw({ type: 'application/json' }));

webhookApp.post('/', async (req, res) => {
  const rawBody = req.body as Buffer; // Now properly captures raw body
  // Signature verification will work
});

export const stripeWebhook = functions.https.onRequest({
  secrets: [stripeSecretKey, stripeWebhookSecret]
}, webhookApp);
```

### Why Firebase Hosting Rewrites Don't Work

Firebase Hosting rewrites are designed for API routes that expect parsed JSON. When Stripe sends a webhook:
1. Stripe sends raw JSON body with signature header
2. Firebase Hosting receives it and parses JSON
3. Firebase Hosting forwards parsed JSON to Cloud Function
4. Cloud Function tries to verify signature with parsed JSON
5. **Signature verification fails** because the body was modified

By using the Cloud Function URL directly:
1. Stripe sends raw JSON body with signature header
2. Cloud Function receives raw body directly
3. Express `raw()` middleware preserves it as Buffer
4. Signature verification succeeds ✅



