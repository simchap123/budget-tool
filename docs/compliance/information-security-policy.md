# Information Security Policy (ISP) — Budget Tool

**Owner:** Simcha Pentelnik (sole operator)
**Effective:** 2026-07-21 · **Review cadence:** annually or on material change
**Contact:** spentelnik@gmail.com

## 1. Purpose & scope
This policy defines how Budget Tool protects the consumer financial data it handles.
Budget Tool is operated by a single individual ("the operator") and is self-hosted on a
DigitalOcean droplet. Scope covers the application, its database, source code, and all
third-party services used to operate it (Plaid, Google Gemini, Cloudflare, DigitalOcean,
GitHub).

## 2. Roles & responsibilities
As a sole-operator service, the operator holds all roles (owner, developer, administrator).
The operator is responsible for implementing, maintaining, and reviewing every control in
this policy. There are no other employees or contractors with system access.

## 3. Access control
- Access to production systems (droplet SSH, PocketBase admin, database) is limited to the
  operator's own accounts. No shared or anonymous accounts exist.
- Role-based access control (RBAC) is enforced in-app: every data collection is scoped to its
  owning user (`userId = @request.auth.id`); no user can read another user's data.
- SSH access uses key-based authentication.
- A documented access-control procedure (see §9 of the Data Retention & Deletion Policy and
  the joiner/mover/leaver note below) governs any future addition or removal of personnel.

### Joiner / mover / leaver (de-provisioning)
Because there are currently no employees, de-provisioning is handled by a documented process:
should anyone ever be granted access, it is recorded; on termination or role change, all
their credentials (SSH keys, service-account invites, dashboard seats) are revoked the same
day and the affected secrets rotated. This process is reviewed at each annual review.

## 4. Authentication
- Multi-factor authentication (MFA) is enabled on every operator account that can reach
  consumer data or the systems that store it: DigitalOcean, Cloudflare, GitHub, Google, and
  the domain registrar.
- The consumer-facing application authenticates users with email + password over TLS; see the
  roadmap note if/when in-app MFA for end users is added.
- Authentication between services uses secure tokens and TLS certificates (Plaid tokens,
  HMAC-signed webhooks, Let's Encrypt certificates), never plaintext shared secrets in transit.

## 5. Data protection
- **In transit:** all traffic uses TLS/HTTPS (Let's Encrypt / Cloudflare).
- **At rest:** the database resides on a private droplet with restricted access; secrets
  (API keys, HMAC secret) are stored in server-side configuration, never in the public repo.
- **Segregation:** the public GitHub repository never contains consumer data, payee names, or
  secrets; sensitive categorization data and credentials are kept server-side only.

## 6. Secure development
- Source is version-controlled in Git.
- Dependencies are tracked; automated dependency vulnerability alerts are enabled (see §7).
- No consumer data is used in development/testing without anonymization.

## 7. Vulnerability management
- Dependency vulnerabilities are surfaced via automated scanning (GitHub Dependabot / `npm
  audit`) on the frontend and any Node components.
- **Patch SLA:** critical/high-severity vulnerabilities are remediated within 7 days of
  detection; medium within 30 days; low at the next routine update.

## 8. Incident response
- On suspected compromise, the operator: (1) rotates affected credentials immediately,
  (2) assesses scope from server and application logs, (3) notifies affected users and Plaid
  without undue delay if consumer data is implicated, (4) records the incident and remediation.

## 9. Third parties
Data is shared only with the service providers listed in the public Privacy Policy, each used
strictly to operate the app. Their security is relied upon per their published terms.

## 10. Retention & deletion
Governed by the separate **Data Retention & Deletion Policy**.

## 11. Review
This policy is reviewed at least annually and whenever the architecture or provider set
changes materially. Last review: 2026-07-21.
