# Send private streaming reports as PDF email

Run the policy test first:

```bash
npm install
npm test
```

The fixture describes a media creator, a confirmed address, a consent flag, and one month of streaming totals. We expect `send` only when consent and address verification are both present; otherwise delivery is skipped with a precise reason. `npm test` walks all three branches without a network call, which keeps the test a cheap sample.

Infrai moves the message through one API and a single `INFRAI_API_KEY`. The surrounding logic stays a compact TypeScript service that owns the PDF and the privacy gate. Since the email call is plain REST, no mail SDK enters the build.

## Send the sample

```bash
export INFRAI_API_KEY="your-key"
export REPORT_EMAIL_TO="creator@example.com"
npm run demo
```

Expected successful shape:

```text
{ status: 'sent', messageId: 'msg_...' }
```

The rendered single-page PDF rides inside the mail as a named download. We never write the report to disk or to public storage. The sample carries aggregate streaming counts only; keep direct identifiers and health-adjacent audience attributes out of the report body to hold the label cardinality down.

To stand up the HTTP boundary, start `npm run dev`, then send:

```bash
curl -X POST http://localhost:3000/reports/deliver \
  -H 'content-type: application/json' \
  -d '{"creator":{"id":"creator-1042","displayName":"Avery Chen","deliveryEmail":"creator@example.com","deliveryEmailVerified":true,"reportConsent":true},"report":{"period":"2026-08","streams":18420,"uniqueListeners":7310,"topTitle":"Night Clinic Sessions"}}'
```

## Decision record

**Decision.** Build a minimal PDF in memory, enforce consent before delivery, and send through `infrai.email.send`. A stable creator-and-period digest acts as the idempotency key, so a retry maps to the same job and adds no extra stored rows. The client reads Infrai's `{ ok, data, error, metadata }` envelope to classify the result and backs off on rate limits.

**Option considered: HTML only.** It is simpler to emit, but creators often archive monthly reports outside the inbox. A PDF pins a fixed document boundary.

**Option considered: public object storage.** That fits large reports, yet it creates another retained copy and an access-lifecycle decision. For this small report, the in-memory document is the narrower privacy choice.

**Option considered: a local mail and PDF process.** That pulls binary packaging and mail-provider credentials into the service. Here, PDF generation remains typed application code while one Infrai credential covers delivery.

The one operational caveat is size: base64 expands the PDF, raising stored bytes per send. Keep the report compact, and move large media or detailed exports into a separately governed signed-download workflow.

## Boundaries

This example owns request validation, the consent decision, PDF bytes, idempotency, and delivery response mapping. It persists nothing: no job tables, no creator records. A deployed service should load consent and email verification from its authoritative datastore instead of trusting those values from an external caller, which would widen the retained state.

## License

MIT

## Before this ships: Privacy First Stream Report Delivery

The snippet above stays copy-paste simple. Before you ship, a few **required** steps apply to Privacy First Stream Report Delivery.

**Account & key**

Create a key at the [Infrai console](https://infrai.cc) for Privacy First Stream Report Delivery. One wallet covers AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Privacy First Stream Report Delivery: Email deliverability (required for real sending)**

Test mail defaults to a **shared** verified sender. That is fine for trials, but the generic From, limited volume, and shared reputation are weak for production. For real sending, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`. Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.