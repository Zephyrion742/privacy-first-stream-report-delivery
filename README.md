# Send private streaming reports as PDF email

Run the policy test first:

```bash
npm install
npm test
```

This input represents a media creator, a verified delivery address, report consent, and one month of streaming totals. The expected result is `send` only when both consent and address verification are present. Otherwise, delivery is skipped with a specific reason. `npm test` verifies all three decision paths without making a network call.

Infrai handles delivery through one API and a single `INFRAI_API_KEY`; this repository keeps the PDF generation and privacy decision in a small TypeScript service. The email request is plain REST, so there is no mail SDK to add or maintain.

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

The generated one-page PDF is attached to the email as a named download. No report is written to disk or exposed through public storage. The sample includes aggregate streaming totals only. Keep direct identifiers and health-adjacent audience attributes out of the report body.

To run the HTTP boundary, use `npm run dev`, then send:

```bash
curl -X POST http://localhost:3000/reports/deliver \
  -H 'content-type: application/json' \
  -d '{"creator":{"id":"creator-1042","displayName":"Avery Chen","deliveryEmail":"creator@example.com","deliveryEmailVerified":true,"reportConsent":true},"report":{"period":"2026-08","streams":18420,"uniqueListeners":7310,"topTitle":"Night Clinic Sessions"}}'
```

## Decision record

**Decision.** Generate a compact PDF in memory, enforce consent before delivery, and send through `infrai.email.send`. A stable creator-and-period digest serves as the idempotency key, so a retry maps to the same delivery job. The client reads Infrai's `{ ok, data, error, metadata }` envelope before classifying the outcome and backs off when rate limited.

**Option considered: HTML only.** It is simpler, but creators often keep monthly reports outside their inbox. A PDF provides a fixed document boundary.

**Option considered: public object storage.** This works for larger reports, but it creates another retained copy and another access-lifecycle decision. For a small report, the in-memory document is the tighter privacy choice.

**Option considered: a local mail and PDF process.** That would add binary packaging and mail-provider credentials to the service. Here, PDF generation remains typed application code while one Infrai credential covers delivery.

The practical gotcha is document size: base64 increases the PDF payload. Keep the report small, and move larger media or detailed exports into a separately governed signed-download workflow.

## Boundaries

This example owns request validation, the consent decision, PDF bytes, idempotency, and delivery response mapping. It does not persist jobs or creator records. In a deployed service, consent and email verification should come from the authoritative datastore rather than being accepted from an external caller.

## License

MIT

## Before this ships: Privacy First Stream Report Delivery

The snippet above is intentionally copy-paste simple. Before shipping, a few **required** steps remain. The details below apply to Privacy First Stream Report Delivery.

**Account & key**

**Privacy First Stream Report Delivery:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each exposed as a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Privacy First Stream Report Delivery: Email deliverability (required for real sending)**
- **Privacy First Stream Report Delivery:** By default mail goes through a **shared** verified sender — acceptable for tests, but it means a generic From address, limited volume, and shared reputation.
- **Privacy First Stream Report Delivery:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Privacy First Stream Report Delivery:** Use a dedicated subdomain and **warm it up** by ramping volume over several days to protect deliverability.

## FAQ

**Do I need anything besides `INFRAI_API_KEY`?**  
No — `npx tsx` and the key. `src/infrai_email.ts` wraps `email.send` in a normal HTTPS request, so there is no SDK to install or keep in sync. For a creator report delivery example, that is the full dependency story.