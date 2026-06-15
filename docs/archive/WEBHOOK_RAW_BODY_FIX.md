# Webhook Raw Body Fix - Latest Attempt

## Problem
The webhook is still receiving a parsed JSON object instead of the raw body, causing signature verification to fail with 400 error.

## Root Cause
Cloud Functions v2 (2nd Gen) might be automatically parsing JSON request bodies before they reach Express middleware, even with `express.raw()`.

## Solution Applied
1. **Added `verify` callback to `express.raw()`**: This callback receives the raw Buffer before it's assigned to `req.body`
2. **Store raw body in `req.rawBody`**: The verify callback stores the raw Buffer for later use
3. **Multiple fallback checks**: The handler now checks `req.rawBody` first, then `req.body` as Buffer, then as string

## Code Changes
```typescript
webhookApp.use(express.raw({ 
  type: 'application/json',
  verify: (req: any, res, buf, encoding) => {
    // Store raw body BEFORE it's parsed
    if (buf && buf.length) {
      req.rawBody = Buffer.from(buf);
      console.log('📦 Raw body captured in verify callback, length:', req.rawBody.length);
    }
  }
}));
```

## Testing
1. Make a test purchase
2. Check Cloud Function logs for:
   - `📦 Raw body captured in verify callback` - This confirms the verify callback is working
   - `✅ Using rawBody from verify callback` - This confirms we're using the raw body
3. Check Stripe Dashboard → Webhooks → Recent Events for 200 status

## If Still Failing
If the body is still parsed as JSON, we need to:
1. **Read from raw request stream directly** - Bypass Express entirely for webhook endpoint
2. **Use Cloud Functions v1** - v1 doesn't auto-parse JSON bodies
3. **Use a different approach** - Handle webhook in a separate service that doesn't parse JSON

## Next Steps
1. Test with a new purchase
2. Check logs to see if `req.rawBody` is being set
3. If still failing, we'll implement direct stream reading

