import { z } from "zod";

export const reportRequestSchema = z.object({
  creator: z.object({
    id: z.string().min(1),
    displayName: z.string().min(1).max(100),
    deliveryEmail: z.string().email(),
    deliveryEmailVerified: z.boolean(),
    reportConsent: z.boolean(),
  }),
  report: z.object({
    period: z.string().regex(/^\d{4}-\d{2}$/),
    streams: z.number().int().nonnegative(),
    uniqueListeners: z.number().int().nonnegative(),
    topTitle: z.string().min(1).max(160),
  }),
});

export type ReportRequest = z.infer<typeof reportRequestSchema>;

export type DeliveryDecision =
  | { action: "send"; request: ReportRequest }
  | { action: "skip"; reason: "consent_required" | "verified_email_required" };

export function decideDelivery(request: ReportRequest): DeliveryDecision {
  if (!request.creator.reportConsent) {
    return { action: "skip", reason: "consent_required" };
  }
  if (!request.creator.deliveryEmailVerified) {
    return { action: "skip", reason: "verified_email_required" };
  }
  return { action: "send", request };
}
