import { createHash } from "node:crypto";
import { decideDelivery, type ReportRequest } from "./delivery_policy.js";
import { generateReportPdf } from "./pdf_report.js";
import { infrai } from "./infrai_email.js";

export type DeliveryResult =
  | { status: "sent"; messageId: string }
  | { status: "skipped"; reason: "consent_required" | "verified_email_required" };

export async function sendCreatorReport(input: ReportRequest): Promise<DeliveryResult> {
  const decision = decideDelivery(input);
  if (decision.action === "skip") return { status: "skipped", reason: decision.reason };

  const pdf = generateReportPdf(input);
  const download = `data:application/pdf;base64,${pdf.toString("base64")}`;
  const deliveryKey = createHash("sha256")
    .update(`${input.creator.id}:${input.report.period}`)
    .digest("hex");
  const result = await infrai.email.send(
    {
      to: input.creator.deliveryEmail,
      subject: `Your ${input.report.period} streaming report`,
      html: `<p>Hello ${escapeHtml(input.creator.displayName)},</p><p>Your streaming report is ready.</p><p><a download="streaming-report-${input.report.period}.pdf" href="${download}">Download PDF report</a></p>`,
    },
    deliveryKey,
  );
  return { status: "sent", messageId: result.message_id };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] as string);
}
