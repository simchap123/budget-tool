# Email → Transaction Capture — Design

**Date:** 2026-07-21
**Status:** Approved, building
**Owner:** simchap

## Goal

Let a user capture spending by having their bank / credit-card **transaction alert
emails** turn into transactions automatically. Each user gets a private,
unguessable email address; they point bank alerts (or a Gmail forwarding rule) at
it; the app parses each email into a transaction that lands in a **review** queue.

## Non-goals / known limitations

This is *email-based expense capture*, **not** a replacement for Plaid bank sync.
Structurally it will miss: checks, cash withdrawals, ACH without alerts, tips added
after auth, refunds/reversals, sub-threshold transactions, and cases where the
posted amount differs from the pending alert. Email transactions therefore start as
**pending/needs-review**; Plaid stays the source of truth where connected.

## Architecture

```
Bank alert email
  → u_<token>@transactions.grotketech.com        (Cloudflare Email Routing, subdomain MX)
  → Cloudflare Email Worker                       (postal-mime parse, token+SPF/DKIM check, HMAC sign)
  → POST budget.grotketech.com/api/inbound/transaction-email   (PocketBase webhook: verify HMAC, store raw, 200)
  → PocketBase cron (every 1 min)                 (extract → dedupe → create transaction)
  → transaction { source:'email', needsReview:true }  → Needs-review UI → user approves
```

Deployment facts (grotketech.com droplet `68.183.101.60`, DNS on Cloudflare):
- Frontend: `budget.grotketech.com` → :3001
- API (PocketBase): `budget.grotketech.com/api/` → :8090
- Receiving subdomain (new): `transactions.grotketech.com` (isolated MX; does not touch grotketech.com's real mail)

## Components

### 1. Cloudflare Email Routing (user configures once)
Enable Email Routing for `transactions.grotketech.com`, add the MX records
Cloudflare provides, and bind the Email Worker as the catch-all handler for the
subdomain. Free Workers tier (100k req/day) is far beyond need.

### 2. Cloudflare Email Worker (`cloudflare/email-worker/`)
Written here, deployed by user via `wrangler`. Responsibilities:
- Parse the raw MIME with **`postal-mime`** (sender, subject, text, html, headers, Message-ID).
- Read the recipient local-part → the user token (`u_<token>`).
- Reject: unknown/oversized (> ~1 MB) messages; keep it lean (no attachments forwarded).
- Read Cloudflare's `Authentication-Results` (SPF/DKIM/DMARC) and pass verdicts along.
- **HMAC-SHA256 sign** the JSON body with `INBOUND_HMAC_SECRET` → `X-Signature` header.
- `POST` to `INBOUND_WEBHOOK_URL` (`https://budget.grotketech.com/api/inbound/transaction-email`).
- Worker secrets (set via `wrangler secret put`): `INBOUND_HMAC_SECRET`, `INBOUND_WEBHOOK_URL`.

Worker → webhook JSON:
```json
{ "token": "u_f8d3k92x", "messageId": "<...@chase.com>", "from": "no.reply.alerts@chase.com",
  "subject": "You made a $53.27 transaction", "text": "...", "html": "...",
  "auth": { "spf": "pass", "dkim": "pass", "dmarc": "pass" }, "receivedAt": "2026-07-21T..." }
```

### 3. PocketBase collections (migrations)

**`email_inboxes`** — one private address per user, rotatable.
`{ userId (rel/text), token (text, unique, indexed), enabled (bool) }`
Owner-scoped list/view/update; create via RPC only. Token = `u_` + 16 url-safe chars.

**`inbound_emails`** — async queue + audit trail.
`{ userId, messageId (text, unique, indexed), fromAddr, subject, raw (text), auth (json),
   status ('pending'|'done'|'skipped'|'error'), error, confidence (number), transactionId }`
`messageId` uniqueness gives free replay/dedup protection. `raw` is cleared once `status=done`.

**`transactions`** — add two fields (admin UI / migration):
`source` (text, e.g. `'email'|'plaid'|'csv'|'manual'`), `needsReview` (bool).

### 4. Webhook — `POST /api/inbound/transaction-email` (`email_inbound.pb.js`)
Public route (no auth cookie). Steps: verify `X-Signature` HMAC against raw body with
`INBOUND_HMAC_SECRET` (constant-time) → resolve `token` → `email_inboxes` (must exist &
enabled) → dedupe on `messageId` (drop if seen) → insert `inbound_emails` `status=pending`
→ return `200 {queued:true}` fast. Bad signature → 401; unknown/disabled token → 202
(silently accept, do nothing — don't leak which tokens exist).

### 5. Cron processor (`email_inbound.pb.js`, `cronAdd("email-extract", "* * * * *", …)`)
For each `pending` inbound_email (small batch): run extraction → if a transaction is
found, dedupe against existing `transactions` (date+amount+description+type, per the
CSV importer) → create `transactions` record `{ userId, date, amount, description, type,
source:'email', needsReview: confidence < 0.9 }` (the existing `onRecordBeforeCreate`
auto-categorizes it) → set inbound_email `status=done`, clear `raw`, store `confidence`
+ `transactionId`. No transaction found → `status=skipped`. Errors → `status=error` + msg.

### 6. Extraction (`email_extract_lib.js`)
`extractTransaction({from, subject, text, html})` → `{ found, amount, description,
merchant, type, date, accountLast4, confidence }`.
- **Phase 1 (now):** Gemini 2.0 Flash (same `$os.getenv("GEMINI_API_KEY")` + `$http.send`
  pattern as `ai.pb.js`) with a strict JSON schema prompt. Handles every bank immediately.
  `confidence` from the model, floored to `needsReview` if unsure or if SPF/DKIM ≠ pass.
- **Phase 2 (hardening):** deterministic regex parsers keyed by sender domain, starting
  with **Chase** (the live account), then Amex / Capital One / Citi / Discover / BofA /
  Wells Fargo / Apple Card. A known-sender hit skips Gemini → confidence ~1.0, zero token cost.

### 7. Frontend
- **Settings → "Email import"** panel: shows the private address with a copy button,
  enable/disable toggle, "rotate address" button (calls RPC to mint a new token), and a
  short guide ("In your bank's alert settings — or a Gmail filter — forward transaction
  alerts to this address"). RPC: `POST /api/rpc/email-inbox` (get-or-create), `…/rotate`, `…/toggle`.
- **Needs-review surface**: a filter/section listing `needsReview` transactions with
  approve / edit-category / discard. Reuses existing transaction list + quick-category.

## Security model
- Address alone never authorizes: HMAC on every webhook call; unknown/disabled tokens do nothing.
- Long, unguessable tokens (`u_` + 16 random url-safe chars); rotatable/disable-able.
- SPF/DKIM/DMARC verdicts forwarded; failures for a claimed bank domain force `needsReview`.
- Dedup: `messageId` unique + amount/description/date/type match.
- No executable attachments (Worker forwards none); ~1 MB size cap.
- `raw` email body deleted from `inbound_emails` after successful extraction.
- All new collections owner-scoped; webhook runs server-side (superuser dao) for token lookup.

## Secrets / config
- Droplet PocketBase env: `INBOUND_HMAC_SECRET` (shared with Worker). `GEMINI_API_KEY` already set.
- Cloudflare Worker secrets: `INBOUND_HMAC_SECRET` (same value), `INBOUND_WEBHOOK_URL`.
- Nothing secret committed (repo is public).

## Testing
- Unit (vitest, frontend utils): token generation shape, address formatting, review-filter
  predicate, dedup predicate reuse.
- Backend: HMAC verify (good/bad sig), extraction JSON-shape parsing (sample Chase/Amex bodies
  → expected fields), cron dedupe against existing.
- Worker: local `wrangler dev` with sample `.eml` fixtures.

## Phasing
1. **Phase 1 (MVP):** collections + webhook + cron + Gemini extraction + Settings panel +
   Needs-review UI + Worker + Cloudflare config. End-to-end capture for all banks.
2. **Phase 2:** deterministic bank parsers (Chase → others); posted-vs-pending re-match.

## Rollout runbook (Cloudflare steps done by user with guidance)
1. Cloudflare → grotketech.com → Email Routing → add subdomain `transactions.grotketech.com`, apply MX.
2. `cd cloudflare/email-worker && wrangler deploy`; `wrangler secret put INBOUND_HMAC_SECRET` / `INBOUND_WEBHOOK_URL`.
3. Bind Worker as catch-all for `transactions.grotketech.com`.
4. Set `INBOUND_HMAC_SECRET` on the droplet; restart PocketBase.
5. In Settings, copy the private address; add a Gmail filter forwarding bank alerts to it.
