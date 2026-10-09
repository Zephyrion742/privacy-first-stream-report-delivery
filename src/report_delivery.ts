import { createServer } from "node:http";
import { ZodError } from "zod";
import { reportRequestSchema } from "./delivery_policy.js";
import { InfraiError } from "./infrai_email.js";
import { sendCreatorReport } from "./report_sender.js";

const port = Number(process.env.PORT ?? 3000);

createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/reports/deliver") {
    return json(response, 404, { error: "not_found" });
  }
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body = reportRequestSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const result = await sendCreatorReport(body);
    return json(response, result.status === "sent" ? 202 : 200, result);
  } catch (error) {
    if (error instanceof ZodError) return json(response, 400, { error: "invalid_request", issues: error.issues });
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      return json(response, status, { error: error.code, message: error.message });
    }
    return json(response, 500, { error: "delivery_failed" });
  }
}).listen(port, () => console.log(`Report delivery listening on http://localhost:${port}`));

function json(response: import("node:http").ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}
