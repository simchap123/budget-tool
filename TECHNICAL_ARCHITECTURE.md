# Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     DigitalOcean Droplet                        │
│                    (68.183.101.60)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐              ┌──────────────────┐        │
│  │   Nginx Proxy    │              │  Docker Network  │        │
│  │  (Port 80/443)   │◄────────────►│                  │        │
│  └──────────────────┘              └──────────────────┘        │
│         │                                    │                  │
│         ├────────────────┬────────────────┬──┴───────────────┐  │
│         ▼                ▼                ▼                 ▼   │
│    ┌─────────┐     ┌──────────┐    ┌──────────┐    ┌────────┐ │
│    │ Finance │     │ Finance  │    │Postgres  │    │ Redis  │ │
│    │ App     │     │ API      │    │ Database │    │(Cache) │ │
│    │(3000)   │     │(3001)    │    │ (5432)   │    │(6379)  │ │
│    └─────────┘     └──────────┘    └──────────┘    └────────┘ │
│         │                ▲              ▲              ▲       │
│         └────────┬───────┘              │              │       │
│                  │                      └──────────────┘       │
│                  │                                             │
│         ┌────────▼────────────────────────────────────┐        │
│         │   Docker Compose (finance-platform)        │        │
│         └─────────────────────────────────────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Next.js 14** - React meta-framework with SSR/SSG
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **Framer Motion** - Animations
- **React Query** - Data fetching
- **Zustand** - State management
- **React Hook Form** - Form handling

### Backend
- **Next.js API Routes** - Lightweight backend
- **TypeScript** - Type safety
- **Node.js 20** - Runtime

### Database
- **PostgreSQL 15** - Relational database
- **Prisma ORM** - Database abstraction
- **PostgreSQL Extensions**:
  - `uuid-ossp` - UUID generation
  - `pg_trgm` - Full-text search optimization
  - `btree_gin` - Index optimization

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Reverse proxy
- **PM2** - Process manager (backup/monitoring)
- **Redis** - Caching layer

### External Services
- **Plaid** - Bank account aggregation
- **Resend** or **SendGrid** - Email service
- **AWS S3** - File storage (CSV exports, PDFs)
- **Claude API** - AI transaction insights

## Architecture Layers

### 1. Presentation Layer (Next.js Frontend)
- Server Components for SSR
- Client Components for interactivity
- Form handling with React Hook Form
- Real-time updates via SWR/React Query

### 2. API Layer (Next.js API Routes)
- RESTful endpoints
- Authentication middleware
- Validation
- Error handling
- Rate limiting

### 3. Business Logic Layer
- Transaction normalization
- Categorization engine
- Deduplication logic
- Financial calculations

### 4. Data Access Layer (Prisma ORM)
- Database queries
- Migrations
- Seeds
- Relations management

### 5. Database Layer (PostgreSQL)
- Transaction data
- User accounts
- Categories
- Rules
- Financial reports
- Audit logs

## Deployment Architecture

### Production Deployment

```
┌─────────────────────────────────────────┐
│     DigitalOcean Droplet               │
│  (Existing: 68.183.101.60)             │
├─────────────────────────────────────────┤
│                                         │
│  ┌────────────────────────────────┐   │
│  │ Docker Engine                  │   │
│  ├────────────────────────────────┤   │
│  │ docker-compose.yml             │   │
│  │  - finance-app (Next.js)       │   │
│  │  - postgres (PostgreSQL)       │   │
│  │  - redis (Cache)               │   │
│  └────────────────────────────────┘   │
│                                         │
│  ┌────────────────────────────────┐   │
│  │ Nginx (/etc/nginx/sites-*/     │   │
│  │  - Reverse proxy               │   │
│  │  - SSL termination             │   │
│  │  - Static asset caching        │   │
│  └────────────────────────────────┘   │
│                                         │
│  ┌────────────────────────────────┐   │
│  │ GitHub Actions CI/CD           │   │
│  │  - Auto-deploy on push         │   │
│  │  - Run tests                   │   │
│  │  - Build Docker image          │   │
│  │  - Update services             │   │
│  └────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Port Configuration

```
Port  | Service              | Internal | Public
------|----------------------|----------|-------
80    | Nginx HTTP           | -        | ✓
443   | Nginx HTTPS          | -        | ✓
3000  | Next.js Frontend     | ✓        | ✗
3001  | Next.js API (alt)    | ✓        | ✗
5432  | PostgreSQL           | ✓        | ✗
6379  | Redis                | ✓        | ✗
22    | SSH                  | -        | ✓
```

## Data Flow

### Authentication Flow
```
1. User submits login
   ↓
2. Next.js API validates credentials
   ↓
3. Generate JWT token (stored in httpOnly cookie)
   ↓
4. Return user profile
   ↓
5. Frontend redirects to dashboard
```

### Transaction Import Flow (CSV)
```
1. User uploads CSV file
   ↓
2. Next.js API parses CSV
   ↓
3. Normalize transactions to schema
   ↓
4. Detect duplicates (amount + date + description)
   ↓
5. Apply deduplication rules
   ↓
6. Store in PostgreSQL
   ↓
7. Trigger AI categorization
   ↓
8. Store categories
   ↓
9. Update dashboard
```

### Plaid Integration Flow
```
1. User initiates Plaid link flow
   ↓
2. Plaid Link modal opens in frontend
   ↓
3. User connects bank account
   ↓
4. Plaid returns public_token
   ↓
5. Next.js API exchanges for access_token
   ↓
6. Store access_token encrypted in database
   ↓
7. Fetch historical transactions
   ↓
8. Daily cron job fetches new transactions
   ↓
9. Normalize and deduplicate
   ↓
10. Store in PostgreSQL
```

### Financial Report Generation Flow
```
1. User selects report (Income Statement, Budget, etc)
   ↓
2. User selects date range
   ↓
3. Next.js API queries PostgreSQL
   ↓
4. Aggregate transactions by category
   ↓
5. Calculate totals and subtotals
   ↓
6. Apply budget comparisons (if applicable)
   ↓
7. Generate PDF/Excel/CSV
   ↓
8. Return to frontend
   ↓
9. User downloads or views
```

## Security Architecture

### Authentication & Authorization
- **JWT tokens** in httpOnly cookies
- **Role-based access control** (user, admin)
- **Session validation** on every API request
- **CSRF protection** via Next.js built-in

### Data Protection
- **Encryption at rest**: PostgreSQL encrypted volumes
- **Encryption in transit**: HTTPS/TLS
- **PII encryption**: Sensitive fields (SSN, account numbers) encrypted with AES-256
- **Plaid token encryption**: Access tokens stored encrypted

### API Security
- **Rate limiting**: 100 requests/minute per user
- **Input validation**: Zod schema validation
- **SQL injection prevention**: Prisma parameterized queries
- **XSS prevention**: React automatic escaping

### Infrastructure Security
- **Firewall**: UFW rules restrict port access
- **SSH keys**: No password authentication
- **Docker**: Non-root user containers
- **Environment variables**: Secrets via .env
- **Database backups**: Daily automated backups

## Scalability Considerations

### Horizontal Scaling (Future)
- Next.js app can run multiple instances behind load balancer
- PostgreSQL read replicas for reporting queries
- Redis cluster for session/cache layer
- Separate background job workers

### Performance Optimization
- **Database indexing**: Composite indexes on common queries
- **Caching**: Redis for frequently accessed data
- **Pagination**: 50-100 items per page
- **Full-text search**: PostgreSQL GIN indexes
- **CDN**: DigitalOcean Spaces for file distribution

## Monitoring & Observability

### Logs
- Application logs → Docker volumes
- Access logs → Nginx logs
- Database logs → PostgreSQL logs
- Aggregation → ELK stack (optional future)

### Metrics
- Response times
- Error rates
- Database query performance
- Memory usage
- Disk usage

### Alerting
- Uptime monitoring
- Error rate thresholds
- Disk space warnings
- Database connection pool

## Backup & Disaster Recovery

### Database Backups
- Daily automated backups via `pg_dump`
- Retention: 30 days
- Stored: DigitalOcean Spaces
- Recovery: pg_restore

### Application Backup
- GitHub as source of truth
- Docker images tagged with versions
- Configuration in version control

## Development Workflow

```
1. Developer pushes to feature branch
2. GitHub Actions runs tests
3. PR created and reviewed
4. Merge to main branch
5. GitHub Actions triggers:
   - Build Docker image
   - Run migrations
   - Deploy to production
   - Run smoke tests
6. Deployment complete
7. Monitoring alerts active
```

## Environment Configuration

### Development
- Docker Compose with local PostgreSQL
- Hot reload enabled
- Detailed logging
- Seed data for testing

### Production
- Docker containers on DigitalOcean
- Encrypted environment variables
- Minimal logging
- Backup-enabled database

## Migration Path

### Phase 1: Foundation
- Next.js app skeleton
- PostgreSQL setup
- Authentication system
- Basic dashboard

### Phase 2: Core Features
- Manual transaction entry
- CSV import
- Basic categorization
- Monthly budget

### Phase 3: Advanced Features
- Plaid integration
- Financial reporting
- Transaction rules
- AI insights

### Phase 4: Scale & Polish
- Performance optimization
- Advanced reporting
- Mobile app
- Enterprise features
