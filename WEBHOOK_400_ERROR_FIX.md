# Fixing Webhook 400 Error - Signature Verification Issue

## Current Situation Assessment

### ✅ What's Working:
1. Webhook secret obtained and set in `.env.local`
2. Environment variable configured
3. Webhook endpoint receiving events from Stripe
4. Code structure is correct

### ❌ Current Problem:
**HTTP 400 Error: "No signatures found matching the expected signature for payload"**

This means:
- Stripe IS sending webhooks ✅
- Your endpoint IS receiving them ✅
- But signature verification is FAILING ❌

### 🔍 Root Cause:
The error message indicates that the **raw request body** is not being preserved correctly. Stripe's signature verification requires the EXACT raw body as sent, but something is modifying it.

---

## Solutions to Try (In Order)

### Solution 1: Verify Webhook Secret Matches (MOST LIKELY ISSUE)

**The Problem:** The webhook secret in your `.env.local` might not match the one in Stripe Dashboard.

**Steps:**
1. Go to Stripe Dashboard → Webhooks → Your webhook endpoint
2. Click **"Reveal"** next to "Signing secret"
3. Copy the EXACT secret (it should start with `whsec_`)
4. Compare it character-by-character with your `.env.local`:
   ```bash
   # In .env.local, line 30 should be:
   STRIPE_WEBHOOK_SECRET=whsec_EXACT_VALUE_FROM_STRIPE
   ```
5. **Important:** Make sure there are NO:
   - Extra spaces
   - Line breaks
   - Quotes around the value (unless it contains spaces)
   - Different secrets for different environments

**Common Mistakes:**
- Using test mode secret in production
- Using production secret in test mode
- Copy-paste errors (missing characters, extra spaces)
- Using an old/regenerated secret

---

### Solution 2: Check if Using Correct Environment

**The Problem:** You might be testing with Stripe test mode but using production secret (or vice versa).

**Steps:**
1. Check Stripe Dashboard → **Toggle** (top right) - is it in "Test mode" or "Live mode"?
2. Check your `.env.local`:
   - If testing: `STRIPE_SECRET_KEY` should start with `sk_test_...`
   - If production: `STRIPE_SECRET_KEY` should start with `sk_live_...`
3. The webhook secret MUST match the mode:
   - Test mode webhook → Test mode secret
   - Live mode webhook → Live mode secret

---

### Solution 3: Verify Webhook Endpoint URL

**The Problem:** The webhook might be pointing to wrong URL or there's a proxy/modifier in between.

**Steps:**
1. In Stripe Dashboard → Webhooks → Your endpoint
2. Check the URL:
   - Should be: `https://your-domain.com/api/stripe/webhook`
   - NOT: `http://localhost:3000/api/stripe/webhook` (unless using Stripe CLI)
   - NOT: `https://your-domain.com/api/stripe/webhook/` (trailing slash)
3. If using a proxy/CDN (Cloudflare, etc.), ensure it's not modifying the body
4. Check if there's any middleware that might be parsing the body

---

### Solution 4: Test with Stripe CLI (Recommended for Debugging)

**Steps:**
1. Install Stripe CLI:
   ```bash
   brew install stripe/stripe-cli/stripe  # macOS
   # Or download from: https://stripe.com/docs/stripe-cli
   ```

2. Login:
   ```bash
   stripe login
   ```

3. Forward webhooks locally:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   This will give you a NEW webhook secret (different from production)

4. Update `.env.local` temporarily:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_... # Use the secret from stripe listen
   ```

5. Restart your dev server:
   ```bash
   npm run dev
   ```

6. Trigger a test event:
   ```bash
   stripe trigger checkout.session.completed
   ```

7. Check if it works locally - if YES, the issue is with production webhook secret

---

### Solution 5: Check Next.js Configuration

**The Problem:** Next.js might be modifying the request body.

**Current Code:** ✅ Already using `request.text()` which is correct

**Additional Check:**
- Ensure no middleware is parsing the body
- Check `next.config.js` for any body parsing config
- Verify the route is not being cached

---

### Solution 6: Verify Production Environment Variable

**If deploying to Vercel/Other Platform:**

1. Go to your deployment platform's environment variables
2. Verify `STRIPE_WEBHOOK_SECRET` is set
3. **Important:** The value must match EXACTLY (character-by-character) with Stripe Dashboard
4. Redeploy after adding/updating the variable

---

## Quick Diagnostic Steps

### Step 1: Verify Secret Format
```bash
# Check your .env.local
grep STRIPE_WEBHOOK_SECRET .env.local

# Should output:
# STRIPE_WEBHOOK_SECRET=whsec_... (38+ characters)
```

### Step 2: Compare with Stripe Dashboard
1. Stripe Dashboard → Webhooks → Your endpoint → Signing secret
2. Copy the secret
3. Compare character-by-character with `.env.local`

### Step 3: Check Webhook Logs in Stripe
1. Stripe Dashboard → Webhooks → Your endpoint → Recent events
2. Click on a failed event (400 error)
3. Check the error message - it should give clues

### Step 4: Test Webhook Health Endpoint
Visit: `https://your-domain.com/api/stripe/webhook-health`

Should show:
```json
{
  "status": "healthy",
  "checks": {
    "webhookSecret": true,
    ...
  }
}
```

---

## Most Common Fix

**90% of the time, the issue is:**

1. **Wrong webhook secret** - Using test secret for live webhook or vice versa
2. **Copy-paste error** - Missing/extra characters in the secret
3. **Environment mismatch** - Secret not set in production environment

**Quick Fix:**
1. Get fresh secret from Stripe Dashboard
2. Copy it EXACTLY (no spaces, no quotes)
3. Update `.env.local` AND production environment
4. Redeploy if needed
5. Test again

---

## After Fixing

Once the 400 error is resolved:
1. Complete Step 4: Disable Cloud Run function
2. Make a test purchase
3. Verify purchase is created with `stripeSessionId`
4. Verify all 5 documents are generated
5. Verify purchase status is `completed`


