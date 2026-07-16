# Budget Tool — Decision Log

Settled architectural and technology decisions.

## Architecture

**D1: Frontend + Backend + PocketBase (Decided)**
- **Frontend**: React 19 + Vite (lightweight, fast builds)
- **Backend**: PocketBase (self-hosted SQLite, REST API built-in)
- **Hosting**: Single DigitalOcean droplet ($5/month)
- **Deployment**: Docker + Systemd + Nginx reverse proxy
- **Rationale**: 
  - Simplicity: No external database service needed
  - Cost: $5/month droplet covers everything
  - Control: Full self-hosting, no vendor lock-in
  - Speed: React+Vite for fast frontend development

**D2: PocketBase over Supabase (Decided)**
- Self-hosted on same droplet, no external service
- SQLite database (sufficient for single-user/small-team)
- Built-in authentication, REST API, admin panel
- Lower cost ($0 vs $25+/month)
- Full data control and privacy
- Easier backup (single SQLite file)

**D3: Separate Frontend + Backend (Decided)**
- Frontend deployable independently
- Can scale differently if needed
- Clear API contracts between front/back
- Easier to test each layer separately
- Better for team collaboration

**D4: React + Vite (Decided)**
- Faster than Next.js for pure frontend
- Simpler deployment (static files + backend)
- Smaller bundle size
- Easier to host anywhere
- Better for SPA applications

**D5: Docker Compose + Systemd (Decided)**
- Docker Compose for local development
- Systemd services for production (simpler than Docker on droplet)
- Nginx reverse proxy for single entry point
- Let's Encrypt SSL/HTTPS

**D6: Single Droplet Strategy (Decided)**
- All services (frontend, backend, database, proxy) on one $5 machine
- Scales fine for single user / small team
- If needed, can upgrade droplet or split later
- Minimal operational complexity
- Cost-effective

## Database

**D7: PocketBase Collections (Decided)**
- **users** — User accounts (auth built-in)
- **accounts** — Bank accounts via Plaid
- **transactions** — Individual transactions
- **categories** — Spending categories
- **rules** — AI categorization rules
- **statements** — Generated reports (cached)
- **audit_logs** — Change tracking

No complex foreign keys; PocketBase handles relations well.

## AI Integration

**D8: Anthropic Claude API (Decided)**
- Claude 3.5 Sonnet for transaction categorization
- API calls from backend (PocketBase hooks)
- User API key stored securely in environment
- Categorization prompt engineering in hooks
- Fallback to manual if AI fails

**D9: Rule Learning System (Decided)**
- Rules stored in `rules` collection
- Types: keyword, merchant_pattern, amount_range
- User corrections update rules
- Applied before/alongside AI categorization
- Improves accuracy over time

## Banking Integration

**D10: Plaid API (Decided)**
- For 12,000+ institution support
- OAuth flow for user authorization
- Sync transactions to `transactions` table
- Alternative: CSV file upload as fallback
- API calls from backend only

## Security

**D11: Self-Hosting for Privacy (Decided)**
- No third-party data processors
- User data stays on their droplet
- HTTPS enforced
- Let's Encrypt SSL certificates
- Nginx rate limiting on API

**D12: Authentication (Decided)**
- PocketBase built-in auth with JWT
- Email/password + optional OAuth
- Session tokens in secure HTTP-only cookies
- Password hashing by PocketBase

## Deployment

**D13: DigitalOcean Droplet (Decided)**
- $5/month basic plan
- Ubuntu 22.04 LTS
- Simple SSH access
- Systemd for service management
- Works with any domain registrar

**D14: Nginx Reverse Proxy (Decided)**
- Single entry point on port 443 (HTTPS)
- Routes to frontend (port 3000) and backend (port 8090)
- Handles SSL/TLS termination
- Rate limiting on API routes
- Security headers

## DevOps

**D15: Backup Strategy (Decided)**
- Manual tar.gz backups of pb_data/
- Download to local machine
- Restore by extracting to droplet
- Test restore regularly

**D16: Secrets Management (Decided)**
- `.env` files for environment variables
- Never commit `.env` files
- Use `.env.example` as template
- Rotate API keys if compromised

## Scalability

**D17: Future Scaling Path (Decided)**
If single droplet becomes limiting:
1. Upgrade droplet size (easy)
2. Split frontend & backend to separate droplets
3. Use managed database (PostgreSQL on DigitalOcean)
4. Use CDN for static assets
5. Add caching layer (Redis)

Current setup handles ~1000+ active users fine.

## Development Workflow

**D18: Git Strategy (Decided)**
- Single main branch for simplicity
- Develop locally with docker-compose
- Test on staging droplet before production
- Keep SETUP.md updated

**D19: Deployment Process (Decided)**
1. Commit and push to main
2. SSH into droplet
3. `git pull` latest code
4. `npm run build` frontend
5. `systemctl restart` services
6. Verify with curl/browser

No CI/CD pipeline needed for MVP.

## Cost Analysis

| Component | Cost | Notes |
|-----------|------|-------|
| Droplet | $5/month | Ubuntu, 1GB RAM, 25GB SSD |
| Domain | ~$12/year | budgettool.com |
| SSL | Free | Let's Encrypt |
| AI API | Pay-as-you-go | Anthropic |
| Banking API | Pay-as-you-go | Plaid (limited free tier) |
| **Total** | **~$20-30/month** | For typical usage |

Alternative (cloud): Would be $50-100+/month with Vercel + Supabase.

## Trade-offs

### Simplicity vs. Features
- Chose simplicity first (single droplet, PocketBase)
- Can add features as needed
- Avoid over-engineering

### Self-hosted vs. Managed
- Chose self-hosted for control & cost
- Trade: Need to maintain server
- Benefit: Full data ownership

### Monolith vs. Microservices
- Chose monolith (simpler, single droplet)
- Can split later if needed
- Fine for MVP phase

## Future Decisions Pending

- [ ] Mobile app (React Native)
- [ ] API authentication scheme
- [ ] Caching strategy
- [ ] Monitoring & alerting
- [ ] Disaster recovery plan
