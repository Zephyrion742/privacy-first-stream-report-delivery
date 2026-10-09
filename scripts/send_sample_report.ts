import { reportRequestSchema } from "../src/delivery_policy.js";
import { sendCreatorReport } from "../src/report_sender.js";

const to = process.env.REPORT_EMAIL_TO;
if (!to) throw new Error("REPORT_EMAIL_TO is required");

const request = reportRequestSchema.parse({
  creator: {
    id: "creator-1042",
    displayName: "Avery Chen",
    deliveryEmail: to,
    deliveryEmailVerified: true,
    reportConsent: true,
  },
  report: {
    period: "2026-08",
    streams: 18420,
    uniqueListeners: 7310,
    topTitle: "Night Clinic Sessions",
  },
});

console.log(await sendCreatorReport(request));
