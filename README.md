# Budget Tool — Budget Management

Self-hosted budget tracking with bank connections, smart categorization, budgets,
and insights. **Live:** https://budget.grotketech.com

## Features

🏦 **Bank connections** — Plaid Hosted Link (connect, auto-sync, dedup, re-auth) + CSV import/export
🧠 **Smart categorization** — suggests a category from *your* history (Gemini fallback for new merchants)
💸 **Transactions** — add / edit / delete, notes, month filter, search, pagination
🎯 **Budgets** — zero-based, per category, with "suggest from spending"; create / edit / delete
🔁 **Recurring** — subscription/bill detection + upcoming-bill forecast & dashboard widget
📊 **Reports & analytics** — income/expense trends, category pie, category-over-time, savings rate, behavior analytics
📱 **PWA** — installable, offline-aware, dark theme
🔒 **Self-hosted** — full control, privacy, low cost

## Tech Stack

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS (Recharts charts)
- **Backend**: PocketBase (SQLite) + JS hooks (`pb_hooks/`)
- **Banking**: Plaid (Hosted Link, production + OAuth, webhooks)
- **AI (optional)**: Google Gemini — category-suggestion fallback only
- **Hosting**: DigitalOcean droplet + Nginx + Let's Encrypt wildcard SSL
- **Tests**: Vitest (`npm test`, 43 tests)

## Project Structure

```
BudgetTool/
├── frontend/              # React app
├── backend/              # PocketBase
├── docker-compose.yml    # Local development
├── nginx.conf           # Production routing
└── _docs/               # Documentation
```

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (or PocketBase binary)
- Git

### 1. Clone & Install

```bash
git clone <repo>
cd BudgetTool
```

### 2. Start Backend (PocketBase)

**Option A: Docker**
```bash
docker-compose up backend
```

**Option B: Binary**
- Download PocketBase from https://pocketbase.io
- Extract to `backend/`
- Run: `pocketbase serve`

Backend runs on: **http://localhost:8090**
Admin panel: **http://localhost:8090/_/**

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: **http://localhost:5173**

### 4. Configure

Copy environment file:
```bash
cp .env.example .env.local
```

Set the Plaid keys (and optional `GEMINI_API_KEY`) on the PocketBase process
env — see the Environment Variables section below.

## Deployment

See **SETUP.md** for complete deployment guide on DigitalOcean.

Quick summary:
1. Create $5/month droplet (Ubuntu 22.04)
2. Install Docker
3. Clone repo
4. Configure `.env`
5. Run `docker-compose up -d`
6. Set up Nginx with SSL
7. Access at `yourdomain.com`

## Database

PocketBase uses SQLite. Collections in use:

- **users** — accounts (built-in auth)
- **transactions** — amount, description, type, category, note, date, plaidId, userId
- **categories** — user categories (name, color, userId)
- **budgets** — per-category monthly budgets (category, budgetAmount, year, month, userId)
- **plaid_items** — linked banks (accessToken, itemId, cursor, needsReauth) — admin-only
- **plaid_pending** — link_token → user mapping for the Plaid webhook — admin-only

Access rules are owner-scoped (`userId = @request.auth.id`) for user data and
admin-only for Plaid secrets. Admin panel: `http://localhost:8090/_/`.

## API

PocketBase provides REST API automatically. All endpoints:

```
/api/collections/{name}/records          # List & create
/api/collections/{name}/records/{id}     # Get, update, delete
/api/collections/users/auth-with-password
/api/collections/users/auth-refresh
```

Custom API endpoints in `backend/pb_hooks/`.

## Development Commands

```bash
# Frontend
cd frontend
npm run dev          # Development
npm run build        # Production build
npm run lint         # Linting
npm run type-check   # TypeScript check
npm test             # Vitest unit tests (43)

# Backend
cd backend
pocketbase serve     # Run PocketBase
pocketbase admin     # Admin panel only
```

## Environment Variables

Frontend build reads `VITE_API_URL` (defaults to `/api`). The Plaid + Gemini
secrets live on the **PocketBase process env** (the pm2 ecosystem file in prod),
read by the JS hooks in `backend/pb_hooks/`:
```
PLAID_CLIENT_ID / PLAID_SECRET_SANDBOX / PLAID_SECRET_PRODUCTION
PLAID_ENV=sandbox|production
PLAID_REDIRECT_URI=https://budget.grotketech.com   # registered in the Plaid dashboard
PLAID_WEBHOOK_SECRET=...                            # authenticates the Plaid webhook
GEMINI_API_KEY=...                                  # optional category-suggestion fallback
```
See `.env.example` (and `OPERATIONS.md` for the live deployment).

## Project Decisions

See `CLAUDE.md` for full tech stack decisions and rationale.

Key points:
- **Self-hosted** on DigitalOcean for full control
- **PocketBase** instead of Supabase for simplicity
- **React + Vite** for lightweight frontend
- **SQLite** for low overhead
- **Single droplet** for minimal cost

## File Storage

PocketBase stores everything in `backend/pb_data/`:
- SQLite database
- Uploaded files (bank statements, receipts)
- Configuration

Backup the `pb_data` folder regularly!

## Costs

- **Droplet**: $5-6/month (DigitalOcean)
- **Domain**: $12+/year (optional)
- **API calls**: Plaid (banking) & optional Gemini (pay-as-you-go)
- **Total**: ~$20-30/month all-in

## Architecture

```
┌─────────────────────────────┐
│   Frontend (React + Vite)   │
│   static build on :3001 (prod) │
│   Port 5173 (development)   │
└──────────────┬──────────────┘
               │
         ┌─────▼──────┐
         │   Nginx    │ ← Reverse proxy, SSL
         └─────┬──────┘
               │
┌──────────────▼─────────────────┐
│ PocketBase API (Port 8090)     │
│                                │
│ ├─ Auth (JWT)                 │
│ ├─ REST API                   │
│ ├─ Real-time updates          │
│ └─ File storage               │
└──────────────┬─────────────────┘
               │
┌──────────────▼─────────────────┐
│   SQLite Database (pb_data/)   │
│   - Users, Accounts            │
│   - Transactions, Categories   │
│   - Rules, Statements          │
└────────────────────────────────┘

External APIs:
├─ Plaid (banking — Hosted Link + webhooks)
└─ Google Gemini (optional category-suggestion fallback)
```

## Security

- PocketBase has built-in auth & RLS
- All traffic over HTTPS (Nginx + Let's Encrypt)
- Environment variables never committed
- Self-hosted = full data control

## Getting Help

- **Operations / deploy / connect Chase**: See `OPERATIONS.md`
- **Multi-app subdomain hosting**: See `deploy/MULTI_APP_HOSTING.md`
- **Feature catalog & build status**: See `DEPLOYMENT_CHECKLIST.md`
- **Setup**: See SETUP.md
- **Tech decisions**: See CLAUDE.md
- **PocketBase docs**: https://pocketbase.io/docs
- **React docs**: https://react.dev
- **Vite docs**: https://vitejs.dev

## License

MIT

## Support

Issues: GitHub Issues
Email: support@budgettool.dev

---

**Ready to start?** → See SETUP.md for local development setup
