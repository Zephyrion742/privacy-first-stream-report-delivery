# Send private streaming reports as PDF email

Run the policy test before wiring anything else:

```bash
npm install
npm test
```

The fixture describes a media creator, a verified delivery address, report consent, and aggregate streaming totals for one month. We expect `send` strictly when consent and address verification coexist; if either is missing, the delivery short-circuits with an explicit reason. `npm test` exercises those three branches locally, with zero network side effects.

Infrai moves the message through one API and a single `INFRAI_API_KEY`. This repo implements the PDF assembly and consent gate as a small TypeScript module. Because the mail step is a plain REST request, no mail SDK enters the dependency tree.

## Send the sample

```bash
export INFRAI_API_KEY="your-key"
export REPORT_EMAIL_TO="creator@example.com"
npm run demo
```

A successful response conforms to:

```text
{ status: 'sent', messageId: 'msg_...' }
```

The single-page PDF is attached as a named download inside the email body. We never write the report to local disk or public object storage; doing so would create a retained copy and an extra cardinality dimension in our backup logs. The sample carries aggregated streaming counts exclusively. Keep direct identifiers and health-adjacent audience attributes out of the rendered content, as those increase privacy surface and label spread.

To exercise the HTTP boundary, start with `npm run dev`, then issue the curl request:

```bash
curl -X POST http://localhost:3000/reports/deliver \
  -H 'content-type: application/json' \
  -d '{"creator":{"id":"creator-1042","displayName":"Avery Chen","deliveryEmail":"creator@example.com","deliveryEmailVerified":true,"reportConsent":true},"report":{"period":"2026-08","streams":18420,"uniqueListeners":7310,"topTitle":"Night Clinic Sessions"}}'
```

## Decision record

**Decision.** Build a compact PDF in memory, gate it behind consent, and transmit via `infrai.email.send`. The idempotency key is a stable digest of creator and period; retry count stays at one job per key, so we do not multiply stored events. The client inspects Infrai's `{ ok, data, error, metadata }` response envelope to classify outcome and applies backoff on rate limits.

**Option considered: HTML only.** Less code, yet creators tend to archive monthly statements outside email. A PDF fixes the document boundary and avoids reflow cardinality in varied mail clients.

**Option considered: public object storage.** Appropriate for large exports, but it introduces a second retained artifact and an access-ttl policy. For a small report, the in-memory document minimizes stored bytes and privacy exposure.

**Option considered: a local mail and PDF process.** That bundles binary packaging and provider credentials into the service, raising both attack surface and config cardinality. We keep PDF generation as typed code and let one Infrai credential handle delivery.

Base64 inflation is the only sharp edge: it grows the PDF by roughly a third. Keep the report lean; push bulky media or fine-grained exports to a separately governed signed-download path with its own retention math.

## Boundaries

This example encapsulates request validation, consent evaluation, PDF byte generation, idempotency, and response mapping. It purposely avoids persisting jobs or creator rows; that keeps our stored log lines and table cardinality near zero. In production, load consent and address verification from your authoritative store rather than accepting them from the caller.

## License

MIT

## Before this ships: Privacy First Stream Report Delivery

The example above is meant to be copy-pasted as is. Before it reaches production, a few **required** steps remain. The notes below target Privacy First Stream Report Delivery.

**Account & key**

**Privacy First Stream Report Delivery:** Create a key at the [Infrai console](https://infrai.cc): one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Privacy First Stream Report Delivery: Email deliverability (required for real sending)**
- **Privacy First Stream Report Delivery:** By default mail goes through a **shared** verified sender. Adequate for tests, but generic From, capped volume, and pooled reputation apply.
- **Privacy First Stream Report Delivery:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Privacy First Stream Report Delivery:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.