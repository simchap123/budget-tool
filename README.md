# Budget Tool — AI-Powered Budget Management

Self-hosted budget tracking with AI-powered transaction categorization, bank connections, and financial reports.

## Features

🏦 **Bank Integration** — Connect via Plaid or upload statements
🤖 **AI Categorization** — Claude auto-categorizes with learning
📊 **Financial Reports** — Income statements like QuickBooks
🎯 **Rule Engine** — ML-powered auto-categorization rules
🔒 **Self-Hosted** — Full control, privacy, low cost

## Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS
- **Backend**: PocketBase (SQLite)
- **AI**: Claude 3.5 Sonnet
- **Banking**: Plaid API
- **Hosting**: DigitalOcean droplet
- **Proxy**: Nginx

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

Edit with your API keys:
- `ANTHROPIC_API_KEY`
- `PLAID_CLIENT_ID` and `PLAID_SECRET`

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

PocketBase uses SQLite. Collections:

- **users** — User accounts (auth built-in)
- **accounts** — Bank accounts (Plaid)
- **transactions** — Bank transactions
- **categories** — Spending categories
- **rules** — AI categorization rules
- **statements** — Generated reports
- **audit_logs** — Change tracking

Admin panel at: `http://localhost:8090/_/`

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

# Backend
cd backend
pocketbase serve     # Run PocketBase
pocketbase admin     # Admin panel only
```

## Environment Variables

See `.env.example`:
```
VITE_API_URL=http://localhost:8090
ANTHROPIC_API_KEY=sk-ant-...
PLAID_CLIENT_ID=...
PLAID_SECRET=...
```

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
- **API calls**: Only Plaid & Anthropic (pay-as-you-go)
- **Total**: ~$20-30/month all-in

## Architecture

```
┌─────────────────────────────┐
│   Frontend (React + Vite)   │
│   Port 3000 (production)    │
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
├─ Plaid (banking)
└─ Anthropic (AI)
```

## Security

- PocketBase has built-in auth & RLS
- All traffic over HTTPS (Nginx + Let's Encrypt)
- Environment variables never committed
- Self-hosted = full data control

## Getting Help

- **Setup**: See SETUP.md
- **Development**: See frontend/ and backend/ README files
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
