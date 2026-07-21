# Budget Tool — Email Ingest Worker

Receives forwarded bank / credit-card transaction-alert emails at
`u_<token>@transactions.grotketech.com` and POSTs them (HMAC-signed) to the
PocketBase webhook, which queues + extracts them into transactions.

See the design: `docs/superpowers/specs/2026-07-21-email-transaction-import-design.md`.

## One-time setup

1. **Cloudflare → grotketech.com → Email → Email Routing**
   - Add / enable Email Routing for the subdomain **`transactions.grotketech.com`**
     and add the MX + TXT records Cloudflare shows. (Subdomain keeps this isolated
     from any real mail on `grotketech.com`.)

2. **Deploy this Worker**
   ```bash
   cd cloudflare/email-worker
   npm install
   npx wrangler login          # first time only
   npx wrangler deploy
   ```

3. **Set the secrets** (the HMAC secret must match the droplet's `INBOUND_HMAC_SECRET`)
   ```bash
   npx wrangler secret put INBOUND_HMAC_SECRET
   npx wrangler secret put INBOUND_WEBHOOK_URL
   #   INBOUND_WEBHOOK_URL = https://budget.grotketech.com/api/inbound/transaction-email
   ```

4. **Bind the Worker to the subdomain**
   - Cloudflare → Email Routing → **Email Workers** → set this Worker
     (`budget-email-ingest`) as the **catch-all** handler for
     `transactions.grotketech.com`.

## How to test

Send/forward any bank alert to `u_<yourtoken>@transactions.grotketech.com`
(get your token from the app: **Settings → Email import**). Within a minute it
appears in the app's **Needs review** list.

`npx wrangler tail` streams live Worker logs while you test.
