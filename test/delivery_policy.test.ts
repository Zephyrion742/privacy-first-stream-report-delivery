import assert from "node:assert/strict";
import test from "node:test";
import { decideDelivery, reportRequestSchema } from "../src/delivery_policy.js";

const eligible = reportRequestSchema.parse({
  creator: {
    id: "creator-7",
    displayName: "Rae",
    deliveryEmail: "rae@example.com",
    deliveryEmailVerified: true,
    reportConsent: true,
  },
  report: { period: "2026-08", streams: 1200, uniqueListeners: 640, topTitle: "Pulse" },
});

test("sends only when report consent and email verification are present", () => {
  assert.equal(decideDelivery(eligible).action, "send");
  assert.deepEqual(decideDelivery({
    ...eligible,
    creator: { ...eligible.creator, reportConsent: false },
  }), { action: "skip", reason: "consent_required" });
  assert.deepEqual(decideDelivery({
    ...eligible,
    creator: { ...eligible.creator, deliveryEmailVerified: false },
  }), { action: "skip", reason: "verified_email_required" });
});
