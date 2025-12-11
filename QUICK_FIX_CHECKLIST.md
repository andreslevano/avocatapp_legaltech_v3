# Quick Fix Checklist - Webhook Configuration

## ✅ What I (AI) Have Done

- [x] Enhanced webhook handler with better logging
- [x] Added duplicate purchase prevention
- [x] Added payment status validation
- [x] Added webhook health check endpoint (`/api/stripe/webhook-health`)
- [x] Added purchase source tracking (`source: 'stripe_webhook'`)
- [x] Improved error messages and debugging

---

## 📋 What You Need to Do (In Order)

### 1. Get Stripe Webhook Secret (5 minutes)

1. Go to: https://dashboard.stripe.com/webhooks
2. Click on your webhook endpoint (or create one if it doesn't exist)
3. Click **"Reveal"** next to "Signing secret"
4. Copy the secret (starts with `whsec_...`)

### 2. Add Webhook Secret to Environment Variables (2 minutes)

**Local (.env.local):**
```bash
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
```

**Production (Vercel/Other Platform):**
- Go to your deployment platform's environment variables
- Add `STRIPE_WEBHOOK_SECRET` with the value from step 1
- Redeploy if needed

### 3. Verify Webhook Endpoint URL (2 minutes)

**In Stripe Dashboard:**
- Go to: https://dashboard.stripe.com/webhooks
- Your webhook should point to:
  ```
  https://your-domain.com/api/stripe/webhook
  ```
- Ensure it's listening for: `checkout.session.completed`

### 4. Disable Cloud Run Function (5 minutes)

**Option A: Disable (Recommended)**
1. Go to: https://console.cloud.google.com/run
2. Find: `autoGenerateStudentDocumentsOnPurchase`
3. Click **Edit** → **Disable** or **Delete**

**Option B: Keep but Modify**
- Modify function to skip purchases without `stripeSessionId`
- Add check: `if (!purchase.stripeSessionId) return;`

### 5. Test Webhook Health (1 minute)

Visit in browser:
```
https://your-domain.com/api/stripe/webhook-health
```

Should show:
```json
{
  "status": "healthy",
  "checks": {
    "webhookSecret": true,
    "stripeSecretKey": true,
    "firebase": true,
    ...
  }
}
```

### 6. Make a Test Purchase (5 minutes)

1. Add item to cart
2. Complete payment in Stripe test mode
3. Check:
   - Purchase appears in Firestore with `stripeSessionId`
   - Purchase status is `completed`
   - All 5 documents are generated
   - Purchase appears in dashboard

---

## 🔍 Verification Steps

After completing above steps, verify:

```bash
# Check webhook health
curl https://your-domain.com/api/stripe/webhook-health

# Check recent purchases (in Firestore console)
# Should have:
# - stripeSessionId: "cs_..."
# - stripePaymentIntentId: "pi_..."
# - status: "completed"
# - source: "stripe_webhook"
# - packageFiles populated with all 5 documents
```

---

## 🚨 If Something Goes Wrong

### Webhook Not Receiving Events
- Check Stripe Dashboard → Webhooks → Recent events
- Verify webhook URL is accessible
- Check `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard

### Purchases Still Created by Cloud Function
- Verify Cloud Run function is disabled
- Check Firestore for purchases without `stripeSessionId`
- Delete any purchases created incorrectly

### Documents Not Generated
- Check webhook logs in Stripe Dashboard
- Check server logs for errors
- Run: `npm run reprocess:purchase <purchaseId>`

---

## 📞 Quick Commands

```bash
# Test webhook locally
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test event
stripe trigger checkout.session.completed

# Reprocess purchase
npm run reprocess:purchase <purchaseId>

# Check purchase documents
npm run list:documents <purchaseId>
```




