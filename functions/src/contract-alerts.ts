// F3 — contract expiry alerts trigger (docs/roadmap/CONTRACT_INTELLIGENCE_PLAN.md).
// Thin hourly trigger: all the logic (scan once per Madrid day, digests at each user's hour) lives in
// the Next.js app at POST /api/cron/contract-alerts, so it shares code and tests with the UI.
// It calls the SSR Cloud Run service directly (Firebase Hosting's proxy cuts requests at ~60 s).

import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret, defineString } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

const cronSecret = defineSecret("CRON_SECRET");
const alertsUrl = defineString("CONTRACT_ALERTS_URL", {
  default: "https://ssravocatlegaltechv3-xph64x4ova-uc.a.run.app/api/cron/contract-alerts",
});

export const contractAlertsHourly = onSchedule(
  {
    schedule: "0 * * * *",
    timeZone: "Europe/Madrid",
    region: "us-central1",
    secrets: [cronSecret],
    timeoutSeconds: 300,
    memory: "256MiB",
    retryCount: 1,
  },
  async () => {
    const res = await fetch(alertsUrl.value(), {
      method: "POST",
      headers: { Authorization: `Bearer ${cronSecret.value()}`, "Content-Type": "application/json" },
      body: "{}",
    });
    const body = await res.text();
    if (!res.ok) {
      logger.error("contract-alerts failed", { status: res.status, body: body.slice(0, 500) });
      throw new Error(`contract-alerts HTTP ${res.status}`);
    }
    logger.info("contract-alerts ok", { body: body.slice(0, 500) });
  }
);
