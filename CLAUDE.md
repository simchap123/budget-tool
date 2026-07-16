# Budget Tool — Frontend + Backend + PocketBase

AI-powered budget tracking with separate frontend/backend, self-hosted on DigitalOcean droplet.

## Architecture

```
Frontend (React + Vite)          Backend (PocketBase)
on port 5173 (dev)      ←→       on port 8090
on port 3000 (prod)              SQLite database
                                 REST API
```

## Tech Stack (Decided)

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS
- **Backend**: PocketBase (self-hosted, SQLite)
- **Hosting**: DigitalOcean droplet ($5-6/month, single machine)
- **AI**: Claude API (via backend)
- **Banking**: Plaid API (via backend)
- **Reverse Proxy**: Nginx (single droplet)

## File Structure

```
BudgetTool/
├── frontend/                   # React + Vite app
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utilities & API client
│   │   ├── styles/            # CSS & design tokens
│   │   └── App.tsx            # Root component
│   ├── public/                # Static assets
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                   # PocketBase backend
│   ├── pb_migrations/         # Database migrations
│   ├── pb_data/              # PocketBase data (SQLite)
│   ├── pb_hooks/             # PocketBase hooks (TypeScript)
│   │   ├── auth.pb.js
│   │   ├── transactions.pb.js
│   │   └── ai.pb.js
│   ├── pb.yml                # PocketBase config
│   └── Dockerfile            # Container setup
│
├── .env.example              # Environment template
├── docker-compose.yml        # Local dev environment
├── nginx.conf               # Production reverse proxy
├── SETUP.md                 # Deployment guide
├── CLAUDE.md                # This file
└── README.md
```

## Development Workflow

### Local Development
```bash
# Terminal 1: Frontend (port 5173)
cd frontend && npm run dev

# Terminal 2: Backend (port 8090)
cd backend && pocketbase serve

# Nginx reverse proxy (optional, for testing production setup)
```

### Environment Variables

**.env.local** (development):
```
VITE_API_URL=http://localhost:8090
VITE_APP_NAME=Budget Tool
```

**Backend .env** (PocketBase):
```
ANTHROPIC_API_KEY=sk-ant-...
PLAID_CLIENT_ID=...
PLAID_SECRET=...
JWT_SECRET=... (auto-generated)
```

## Database (PocketBase)

PocketBase uses SQLite with a simple REST API. Collections:

- **users** — User accounts (auth built-in)
- **accounts** — Connected bank accounts
- **transactions** — Individual transactions
- **categories** — Spending categories
- **rules** — AI categorization rules
- **statements** — Generated reports
- **audit_logs** — Change tracking

## API Routes

### Auth (built-in PocketBase)
```
POST   /api/collections/users/auth-with-password
POST   /api/collections/users/auth-refresh
POST   /api/collections/users/auth-logout
GET    /api/collections/users/records/:id
```

### Transactions
```
GET    /api/collections/transactions/records
POST   /api/collections/transactions/records
PATCH  /api/collections/transactions/records/:id
DELETE /api/collections/transactions/records/:id
```

### AI Categorization (Custom)
```
POST   /api/rpc/categorize (triggers Claude)
POST   /api/rpc/batch-categorize
POST   /api/rpc/learn-rule
```

### Plaid Integration (Custom)
```
POST   /api/rpc/plaid-link-token
POST   /api/rpc/plaid-exchange-token
POST   /api/rpc/plaid-sync
```

## Deployment (DigitalOcean)

### Droplet Setup
1. Create $5/month droplet (Ubuntu 22.04)
2. SSH in and install Docker
3. Clone repo
4. Run `docker-compose up -d`
5. Nginx handles routing to frontend (port 3000) and backend (port 8090)

### Domains
```
Budget Tool App:  budgettool.com → localhost:3000 (Nginx)
PocketBase Admin: pb.budgettool.com → localhost:8090/admin (Nginx)
API:              api.budgettool.com → localhost:8090 (Nginx)
```

## Local Development (No Docker)

### Install PocketBase
1. Download from https://pocketbase.io
2. Extract to `backend/`
3. Run: `pocketbase serve`
4. Admin panel: http://localhost:8090/_/

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Principles

- **Simple**: Single droplet, self-hosted, no external dependencies
- **Fast**: React + Vite frontend, SQLite backend (no database overhead)
- **Affordable**: $5-6/month droplet covers everything
- **Maintainable**: Clear separation of concerns
- **Scalable**: Easy to upgrade droplet if needed

## Decision Log

**D1: PocketBase instead of Supabase**
- Self-hosted on same droplet
- No external database service
- Lower cost ($0 vs $25+/month)
- Simpler deployment

**D2: React + Vite instead of Next.js**
- Lighter frontend
- Easier to separate from backend
- Faster build times
- Can deploy separately

**D3: DigitalOcean Droplet instead of Vercel**
- Full control over deployment
- Lower cost ($5/month vs $10+)
- Easier to customize
- Self-hosted advantage

**D4: SQLite instead of PostgreSQL**
- Built into PocketBase
- No separate database service
- Sufficient for single-user/small-team budgets
- Easier backup (single file)

**D5: Nginx reverse proxy**
- Single entry point
- Handle SSL/HTTPS
- Route to frontend and backend
- Production-standard

## Next Steps

1. Read SETUP.md for full deployment guide
2. Install PocketBase locally
3. Build frontend components
4. Set up API hooks in PocketBase
5. Deploy to DigitalOcean
