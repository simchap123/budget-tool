# Plaid Data-Security Attestations — Readiness Map

Sole-operator, self-hosted app. **Only attest to what is actually true.** This maps each
Plaid attestation to its current status and what makes it truthful. Legend: ✅ satisfied ·
🔧 quick action by you · 🛠️ needs a build · ⚠️ judgment call.

| # | Attestation | Status | What satisfies it / to-do |
|---|---|---|---|
| 1 | Automated de-provisioning for terminated/transferred employees | ✅* | No employees. ISP §3 documents the joiner/mover/leaver process. Attest based on the documented process. |
| 2 | Zero trust access architecture | ⚠️ | Every system requires authenticated, MFA-protected access; no implicit network trust. Reasonable to attest for this footprint — confirm you're comfortable it's true. |
| 3 | MFA on internal systems storing/processing consumer data | 🔧 | Turn on MFA: DigitalOcean, Cloudflare, GitHub, Google, domain registrar. Then attest. |
| 4 | Data deletion and retention policy | ✅ | `docs/compliance/data-retention-and-deletion-policy.md`. |
| 5 | Information Security Policy (ISP) | ✅ | `docs/compliance/information-security-policy.md`. |
| 6 | Secure tokens and certificates for authentication | ✅ | TLS everywhere, Plaid tokens, HMAC-signed webhooks, Let's Encrypt certs. Documented in ISP §4. |
| 7 | Centralized identity & access management | ⚠️ | Literally means an IdP/SSO across systems. If you sign in to your services via one Google identity, that's your basis; otherwise this is a gap — don't attest unless true. |
| 8 | MFA on the consumer-facing app where Plaid Link runs | 🛠️ | **Not yet true** — the app login is email+password only. Needs in-app 2FA before you can attest. I can build TOTP 2FA. |
| 9 | Vulnerability scanning | 🔧 | Enable GitHub Dependabot (repo → Settings → Code security) and/or run `npm audit`. |
| 10 | Patch vulnerabilities within an SLA | ✅ | SLA defined in ISP §7 (critical/high 7d, medium 30d). Follow it. |
| 11 | Published privacy policy | 🔧✅ | Written + deploying to `https://budget.grotketech.com/privacy.html`. Attest once it's live. |
| 12 | Role-based access control (RBAC) | ✅ | Already attested. Enforced via `userId = @request.auth.id` on every collection. |
| 13 | Documented access control policy | ✅ | Already attested. Covered by ISP §3. |

## Your remaining actions
1. **Turn on MFA** (#3): DigitalOcean, Cloudflare, GitHub, Google, registrar. ~10 min.
2. **Enable Dependabot** (#9): GitHub repo → Settings → Code security → enable Dependabot alerts.
3. **Confirm #2 and #7** are true for your setup before attesting (don't over-claim).
4. **Decide on #8**: add in-app 2FA (recommended — I can build it) so you can truthfully attest,
   or leave it un-attested for now.
5. Attest #1, #4, #5, #6, #10, #11 (once privacy URL is live), #12, #13.

*#1 attested on the basis of the documented sole-operator process, not an automated IdP.
