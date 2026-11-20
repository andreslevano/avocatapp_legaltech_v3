// Yousign webhook events → background processing (docs/yousign/YOUSIGN_IMPLEMENTATION_PLAN.md §7).
// The webhook route only stores the event (Yousign wants a 2xx in < 1 s); this trigger asks the
// Next.js app to process it (status, Avocat emails, filing), so the logic lives in one place.
// It calls the SSR Cloud Run service directly (Firebase Hosting's proxy cuts requests at ~60 s).

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret, defineString } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

const cronSecret = defineSecret("CRON_SECRET");
const processUrl = defineString("SIGNATURE_EVENTS_URL", {
  default: "https://ssravocatlegaltechv3-xph64x4ova-uc.a.run.app/api/signatures/yousign/process",
});

export const processSignatureEvent = onDocumentCreated(
  {
    document: "signature_webhook_events/{eventId}",
    region: "us-central1",
    secrets: [cronSecret],
    timeoutSeconds: 120,
    memory: "256MiB",
    retry: false,           // the hourly cron sweeps anything left unprocessed
  },
  async (event) => {
    const eventId = event.params.eventId;
    const res = await fetch(processUrl.value(), {
      method: "POST",
      headers: { Authorization: `Bearer ${cronSecret.value()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    });
    const body = await res.text();
    if (!res.ok) logger.error("signature event failed", { eventId, status: res.status, body: body.slice(0, 300) });
    else logger.info("signature event", { eventId, body: body.slice(0, 200) });
  }
);
