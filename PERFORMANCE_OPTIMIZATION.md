# Performance Optimization Strategy

Complete performance optimization specifications for the AI-powered personal finance platform.

## Executive Summary

This document outlines a comprehensive performance optimization strategy targeting **sub-second response times**, **optimal Core Web Vitals**, and **scalable infrastructure** for handling thousands of concurrent users with millions of transactions.

Key targets:
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Interaction to Next Paint (INP)**: < 200ms
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Backend API Response Time**: < 200ms (p95)
- **Database Query Time**: < 100ms (p95)
- **Initial Page Load**: < 3s
- **Bundle Size**: < 150KB gzipped

---

## 1. Frontend Performance Optimization

### 1.1 Core Web Vitals Targets

#### Largest Contentful Paint (LCP) - Target: < 2.5s

**Strategy:**
- Implement critical CSS inline in `<head>` for above-the-fold content
- Lazy load non-critical fonts and stylesheets
- Optimize hero images (dashboard cards, charts)
- Preload high-priority resources

**Implementation:**
```javascript
// vite.config.ts - Critical CSS extraction
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'critical': ['./src/components/Dashboard', './src/components/Navbar']
        }
      }
    }
  }
};

// In HTML head - Preload critical resources
<link rel="preload" as="script" href="/critical.js">
<link rel="preload" as="style" href="/critical.css">
<link rel="preload" as="image" href="/hero.webp">
```

**Audit Tools:**
- Google PageSpeed Insights
- WebPageTest
- Lighthouse CI in CI/CD pipeline

#### Interaction to Next Paint (INP) - Target: < 200ms

**Strategy:**
- Defer non-critical JavaScript with `async` and `defer` attributes
- Break up long tasks (>50ms) into smaller chunks
- Implement request idle callback for background work
- Use Web Workers for heavy computations

**Implementation:**
```javascript
// Defer heavy calculations to Web Workers
// src/workers/transactionProcessor.ts
self.onmessage = (event: MessageEvent<Transaction[]>) => {
  const categorized = categorizeBatch(event.data);
  self.postMessage(categorized);
};

// In component:
const categorizeTransactions = (transactions: Transaction[]) => {
  const worker = new Worker(
    new URL('../workers/transactionProcessor.ts', import.meta.url),
    { type: 'module' }
  );
  
  worker.postMessage(transactions);
  worker.onmessage = (e) => setProcessedTransactions(e.data);
};

// Break long operations into chunks
const processInChunks = async (items: any[], processor: Function, chunkSize = 100) => {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await Promise.all(chunk.map(processor));
    
    // Yield to browser to handle user input
    await new Promise(resolve => requestIdleCallback(resolve));
  }
};
```

#### Cumulative Layout Shift (CLS) - Target: < 0.1

**Strategy:**
- Reserve space for dynamic content (skeleton loaders)
- Avoid layout-shifting animations
- Set dimensions for images and iframes
- Use CSS `aspect-ratio` for responsive images

**Implementation:**
```css
/* Skeleton loaders - reserve space */
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Reserve space for transaction list items */
.transaction-item {
  min-height: 64px; /* Prevents shift when content loads */
}

/* Aspect ratio for images */
.dashboard-card-image {
  aspect-ratio: 16 / 9;
  width: 100%;
  object-fit: cover;
}
```

### 1.2 Code Splitting & Lazy Loading

**Strategy:** Split code by route and feature to reduce initial bundle

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Lazy-load route components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const Transactions = lazy(() => import('./pages/Transactions'));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/dashboard" 
          element={
            <Suspense fallback={<LoadingShell />}>
              <Dashboard />
            </Suspense>
          } 
        />
        <Route 
          path="/reports" 
          element={
            <Suspense fallback={<LoadingShell />}>
              <Reports />
            </Suspense>
          } 
        />
        <Route 
          path="/transactions" 
          element={
            <Suspense fallback={<LoadingShell />}>
              <Transactions />
            </Suspense>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <Suspense fallback={<LoadingShell />}>
              <Settings />
            </Suspense>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}
```

**Vite Configuration for Code Splitting:**
```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code
          'vendor': [
            'react',
            'react-dom',
            'axios'
          ],
          // Split charting library (heavy)
          'charts': ['recharts'],
          // Split UI components
          'ui': [
            './src/components/ui/Button',
            './src/components/ui/Card',
            './src/components/ui/Modal'
          ],
          // Split pages
          'dashboard': ['./src/pages/Dashboard'],
          'reports': ['./src/pages/Reports'],
          'transactions': ['./src/pages/Transactions']
        }
      }
    },
    // Minify CSS too
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
});
```

### 1.3 Image Optimization

**Strategy:** Serve modern formats with fallbacks, use responsive images

```javascript
// src/components/OptimizedImage.tsx
interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export function OptimizedImage({ src, alt, width, height }: OptimizedImageProps) {
  const basePath = src.replace(/\.[^.]+$/, '');
  
  return (
    <picture>
      {/* WebP format for modern browsers */}
      <source 
        srcSet={`${basePath}.webp 1x, ${basePath}-2x.webp 2x`}
        type="image/webp"
      />
      {/* AVIF for cutting-edge browsers */}
      <source 
        srcSet={`${basePath}.avif 1x, ${basePath}-2x.avif 2x`}
        type="image/avif"
      />
      {/* Fallback to PNG/JPG */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        style={{ 
          aspectRatio: `${width}/${height}`,
          width: '100%',
          height: 'auto'
        }}
      />
    </picture>
  );
}

// Usage:
<OptimizedImage src="/dashboard-hero.png" alt="Dashboard" width={1200} height={600} />
```

**Build-time Image Optimization:**
```bash
# Add to build pipeline (CI/CD)
# Convert PNG/JPG to WebP and AVIF
cwebp -q 75 input.png -o output.webp
cavif input.png -o output.avif

# Responsive images
convert original.png -resize 1200x600 -quality 75 desktop.webp
convert original.png -resize 800x400 -quality 75 tablet.webp
convert original.png -resize 400x200 -quality 75 mobile.webp
```

### 1.4 Font Loading Optimization

**Strategy:** System fonts for speed, async Google Fonts with `font-display: swap`

```css
/* tailwind.config.js */
module.exports = {
  theme: {
    fontFamily: {
      sans: [
        'system-ui',
        '-apple-system',
        'sans-serif',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto'
      ],
      serif: [
        'ui-serif',
        'Georgia',
        'serif'
      ]
    }
  }
};

/* If using Google Fonts, use font-display: swap */
/* In HTML head */
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link 
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" 
  rel="stylesheet"
>

/* Or use @import with font-display */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: swap;
}
```

### 1.5 Bundle Size Optimization

**Current Target:** < 150KB gzipped initial load

**Analysis & Optimization:**
```bash
# Generate bundle report in CI/CD
vite build --outDir dist && vite-bundle-visualizer dist

# Monitor bundle size over time
# .github/workflows/bundle-size.yml
- name: Check bundle size
  run: |
    SIZE=$(du -sh dist/index.*.js | awk '{print $1}')
    if [ "$SIZE" > "150K" ]; then
      echo "Bundle too large: $SIZE"
      exit 1
    fi
```

**Dependency Audit:**
```bash
# Regular security and size audits
npm audit
npm audit fix

# Check for duplicate dependencies
npm ls | grep duplicate

# Identify large dependencies
npm ls --depth=0 | sort -k 2 -rn | head -20
```

**Remove Unused Code:**
```javascript
// vite.config.ts - Tree shaking configuration
export default {
  build: {
    terserOptions: {
      compress: {
        unused: true,
        dead_code: true
      }
    }
  }
};

// Example: Only import needed Recharts components
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
// NOT: import * as Recharts from 'recharts';
```

---

## 2. Backend API Performance

### 2.1 Response Time Targets

**Target:** < 200ms p95 response time across all endpoints

**Breakdown by Endpoint Category:**
- **Auth endpoints**: < 150ms
- **Dashboard queries**: < 100ms
- **Transaction queries**: < 200ms
- **Report generation**: < 2s
- **Search queries**: < 500ms

### 2.2 Request/Response Compression

**Strategy:** Enable gzip compression for all API responses

```javascript
// PocketBase hook - Enable compression middleware
// backend/pb_hooks/main.pb.js

routerAdd("GET", "/api/collections/:collection/records", (c) => {
  // Set compression header
  c.Response().Header().Set("Content-Encoding", "gzip");
  
  return c.JSON(200, records);
}, $apis.requireRecordAuth());
```

**Nginx Configuration:**
```nginx
# nginx.conf
http {
  # Enable gzip compression
  gzip on;
  gzip_vary on;
  gzip_min_length 1000;
  gzip_types text/plain text/css text/xml text/javascript 
             application/json application/javascript application/xml+rss 
             application/rss+xml font/truetype font/opentype 
             application/vnd.ms-fontobject image/svg+xml;
  gzip_proxied any;
  gzip_comp_level 6;
  gzip_disable "msie6";
  
  server {
    # Enable HTTP/2 for multiplexing
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
  }
}
```

### 2.3 Caching Strategy

#### Browser Caching
```nginx
# nginx.conf - Cache static assets
location ~* \.(js|css|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
  add_header X-Content-Type-Options "nosniff";
}

# HTML files - Always revalidate
location ~* \.html$ {
  expires -1;
  add_header Cache-Control "public, must-revalidate, proxy-revalidate";
  add_header ETag '"$date_gmt"';
}
```

#### API Response Caching with Redis
```javascript
// backend/pb_hooks/api.pb.js
// Cache dashboard data for 5 minutes

const CACHE_TTL = 300; // 5 minutes

routerAdd("GET", "/api/dashboard/:userId", (c) => {
  const userId = c.PathParam("userId");
  const cacheKey = `dashboard:${userId}`;
  
  // Check Redis cache
  const cached = $app.Cache().Get(cacheKey);
  if (cached) {
    return c.JSON(200, JSON.parse(cached));
  }
  
  // If not cached, fetch from database
  const dashboard = fetchDashboard(userId);
  
  // Cache for 5 minutes
  $app.Cache().Set(cacheKey, JSON.stringify(dashboard), CACHE_TTL);
  
  return c.JSON(200, dashboard);
}, $apis.requireRecordAuth());

// Invalidate cache on transaction create/update
onRecordAfterCreateRequest((c) => {
  if (c.RecordBefore.Collection == "transactions") {
    const userId = c.RecordBefore.GetString("userId");
    $app.Cache().Remove(`dashboard:${userId}`);
    $app.Cache().Remove(`transactions:${userId}:*`);
  }
}, "transactions");
```

**Cache Invalidation Strategy:**
```javascript
// When a transaction is modified, invalidate related caches
const invalidateUserCaches = (userId: string) => {
  // Invalidate dashboard
  cache.del(`dashboard:${userId}`);
  
  // Invalidate all transaction queries for this user
  cache.del(`transactions:${userId}:*`);
  
  // Invalidate reports
  cache.del(`reports:${userId}:*`);
  
  // Invalidate category summary
  cache.del(`categories:${userId}:summary`);
};
```

**Cache Warming:**
```javascript
// Pre-load cache on application startup
const prewarmCache = async () => {
  const users = await getActiveUsers();
  
  for (const user of users) {
    const dashboard = await fetchDashboard(user.id);
    await cache.setex(`dashboard:${user.id}`, 300, dashboard);
    
    const categories = await fetchCategories(user.id);
    await cache.setex(`categories:${user.id}:summary`, 3600, categories);
  }
};

app.onStart(prewarmCache);
```

---

## 3. Database Performance

### 3.1 Connection Pooling

**Strategy:** Maintain persistent connections to reduce overhead

```javascript
// PocketBase uses connection pooling internally
// For custom implementations, configure pool size:

const dbConfig = {
  max: 20,              // Max connections
  min: 5,               // Min connections
  acquireTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
};
```

**Monitoring Connection Pool:**
```sql
-- Check active connections
SELECT datname, count(*) FROM pg_stat_activity 
GROUP BY datname;

-- Check max connections setting
SHOW max_connections;

-- Monitor idle connections
SELECT * FROM pg_stat_activity 
WHERE state = 'idle';
```

### 3.2 Query Optimization

#### Indexing Strategy

**Critical Indexes Already Defined (per DATABASE_SCHEMA.md):**
```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);

-- Transaction queries (most frequent)
CREATE INDEX idx_transactions_userId ON transactions(userId);
CREATE INDEX idx_transactions_accountId ON transactions(accountId);
CREATE INDEX idx_transactions_categoryId ON transactions(categoryId);
CREATE INDEX idx_transactions_transactionDate ON transactions(transactionDate);

-- Composite indexes for dashboard queries
CREATE INDEX idx_transactions_user_date 
  ON transactions(userId, transactionDate DESC);

CREATE INDEX idx_transactions_category_date 
  ON transactions(userId, categoryId, transactionDate DESC);

-- Full-text search on transaction descriptions
CREATE INDEX idx_transactions_search ON transactions USING GIN (
  to_tsvector('english', description || ' ' || COALESCE(merchant, ''))
);

-- Account queries
CREATE INDEX idx_accounts_userId ON accounts(userId);
CREATE INDEX idx_accounts_plaidAccountId ON accounts(plaidAccountId);

-- Category performance
CREATE INDEX idx_categories_userId ON categories(userId);
CREATE INDEX idx_categories_parentCategoryId ON categories(parentCategoryId);

-- Budget period queries
CREATE INDEX idx_budgets_period ON budgets(year, month);
```

**Additional Recommended Indexes:**

```sql
-- For balance calculations
CREATE INDEX idx_accounts_balance_query 
  ON accounts(userId, isActive, currentBalance)
  WHERE isActive = true;

-- For reconciliation queries
CREATE INDEX idx_transactions_reconciliation
  ON transactions(userId, isReconciled, transactionDate DESC);

-- For duplicate detection
CREATE INDEX idx_transactions_duplicate_check
  ON transactions(userId, amount, transactionDate, description)
  WHERE isDuplicate = false;

-- For report queries (month/year)
CREATE INDEX idx_transactions_report_query
  ON transactions(userId, transactionDate, categoryId, type);
```

**Index Maintenance:**
```sql
-- Analyze query performance regularly
ANALYZE transactions;
ANALYZE accounts;

-- Rebuild fragmented indexes
REINDEX INDEX CONCURRENTLY idx_transactions_userId;

-- Check index size
SELECT 
  indexrelname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;

-- Monitor index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### 3.3 Query Patterns & N+1 Prevention

**Pattern: Dashboard Query (No N+1)**
```javascript
// GOOD - Single query with JOIN
const getDashboard = async (userId: string) => {
  const [accounts, recentTransactions, categoryBreakdown] = await Promise.all([
    // Single query for accounts with their latest balance
    db.account.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        accountType: true,
        currentBalance: true,
        lastSyncAt: true
      }
    }),
    
    // Single query for recent transactions with joined category/account data
    db.transaction.findMany({
      where: { userId },
      take: 20,
      orderBy: { transactionDate: 'desc' },
      select: {
        id: true,
        description: true,
        amount: true,
        transactionDate: true,
        account: { select: { name: true } },
        category: { select: { name: true, color: true } }
      }
    }),
    
    // Single aggregation query for category breakdown
    db.$queryRaw`
      SELECT 
        c.id,
        c.name,
        c.color,
        SUM(t.amount) as total,
        COUNT(t.id) as count
      FROM transactions t
      JOIN categories c ON t.categoryId = c.id
      WHERE t.userId = ${userId}
        AND t.transactionDate >= NOW() - INTERVAL 1 MONTH
        AND t.type = 'expense'
      GROUP BY c.id, c.name, c.color
      ORDER BY total DESC
    `
  ]);
  
  return {
    accounts,
    recentTransactions,
    categoryBreakdown
  };
};

// BAD - N+1 problem
const getDashboardBad = async (userId: string) => {
  const accounts = await db.account.findMany({ where: { userId } });
  
  // This causes N queries (one for each account)
  const accountsWithBalance = await Promise.all(
    accounts.map(async (account) => ({
      ...account,
      transactions: await db.transaction.findMany({
        where: { accountId: account.id },
        take: 5
      })
    }))
  );
  
  return accountsWithBalance;
};
```

**Pattern: Batch Transaction Processing**
```javascript
// GOOD - Batch insert to reduce round trips
const importTransactions = async (userId: string, transactions: Transaction[]) => {
  // Insert in batches of 1000
  const batchSize = 1000;
  
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    
    await db.transaction.createMany({
      data: batch.map(t => ({
        userId,
        accountId: t.accountId,
        description: t.description,
        amount: t.amount,
        transactionDate: t.date,
        categoryId: null, // Will be categorized asynchronously
        source: 'csv'
      }))
    });
  }
};

// BAD - Individual inserts
const importTransactionsBad = async (userId: string, transactions: Transaction[]) => {
  for (const t of transactions) {
    await db.transaction.create({
      data: {
        userId,
        accountId: t.accountId,
        description: t.description,
        amount: t.amount,
        transactionDate: t.date
      }
    });
  }
};
```

### 3.4 Pagination Strategy

**Target:** Fetch 50-100 items per page

```javascript
// Cursor-based pagination (better for large datasets)
interface PaginationParams {
  cursor?: string;
  limit?: number;
}

const getTransactions = async (
  userId: string,
  { cursor, limit = 50 }: PaginationParams = {}
) => {
  const transactions = await db.transaction.findMany({
    where: { userId },
    take: limit + 1, // Fetch one extra to know if there are more
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
    orderBy: { transactionDate: 'desc' }
  });
  
  const hasMore = transactions.length > limit;
  const items = hasMore ? transactions.slice(0, -1) : transactions;
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  
  return {
    items,
    nextCursor,
    hasMore
  };
};

// Offset-based pagination (for smaller datasets)
const getCategories = async (
  userId: string,
  page: number = 1,
  pageSize: number = 50
) => {
  const skip = (page - 1) * pageSize;
  
  const [items, total] = await Promise.all([
    db.category.findMany({
      where: { userId },
      skip,
      take: pageSize,
      orderBy: { displayOrder: 'asc' }
    }),
    db.category.count({ where: { userId } })
  ]);
  
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
};
```

### 3.5 Materialized Views for Complex Queries

**Use Case: Monthly Spending Summary**

```sql
-- Create materialized view for monthly summaries
CREATE MATERIALIZED VIEW monthly_spending_summary AS
SELECT 
  t.userId,
  DATE_TRUNC('month', t.transactionDate)::DATE as month,
  c.id as categoryId,
  c.name as categoryName,
  SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as totalExpense,
  SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as totalIncome,
  COUNT(*) as transactionCount
FROM transactions t
LEFT JOIN categories c ON t.categoryId = c.id
GROUP BY t.userId, DATE_TRUNC('month', t.transactionDate), c.id, c.name;

-- Create index on materialized view
CREATE INDEX idx_monthly_summary_user_month 
  ON monthly_spending_summary(userId, month DESC);

-- Refresh view daily
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_spending_summary;

-- Use in queries
SELECT * FROM monthly_spending_summary 
WHERE userId = '...' 
  AND month >= '2024-01-01'
ORDER BY month DESC;
```

**Refresh Strategy:**
```bash
# Daily refresh in cron job (backend/pb_hooks/crons.pb.js)
cronAdd(
  "refresh_reports",
  "0 2 * * *", // 2 AM daily
  async () => {
    await $app.Dao().DB()
      .Raw("REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_spending_summary")
      .Exec();
    console.log("Monthly spending summary refreshed");
  }
);
```

---

## 4. Transaction Report Generation Optimization

### 4.1 Async Report Generation

**Strategy:** Generate reports asynchronously, store in Redis, allow download

```javascript
// backend/pb_hooks/reports.pb.js

// Endpoint to request report
routerAdd("POST", "/api/reports", async (c) => {
  const userId = c.Get("userId");
  const reportType = c.FormValue("reportType");
  const startDate = c.FormValue("startDate");
  const endDate = c.FormValue("endDate");
  
  // Create report record with "pending" status
  const report = new DynamicModel({
    collectionId: 'reports',
    userId: userId,
    reportType: reportType,
    startDate: startDate,
    endDate: endDate,
    status: 'pending',
    createdAt: new Date()
  });
  
  await $app.Dao().SaveRecord(report);
  
  // Trigger async generation (queue job)
  generateReportAsync(report.id, userId, reportType, startDate, endDate);
  
  return c.JSON(202, {
    id: report.id,
    status: 'pending',
    message: 'Report generation started'
  });
});

// Async job processor
const generateReportAsync = async (
  reportId: string,
  userId: string,
  reportType: string,
  startDate: string,
  endDate: string
) => {
  try {
    // Query data
    const data = await generateReportData(
      userId,
      reportType,
      startDate,
      endDate
    );
    
    // Generate PDF/CSV
    const fileContent = formatReportFile(data, reportType);
    
    // Store file in PocketBase storage
    const filePath = `reports/${userId}/${reportId}.${reportType === 'pdf' ? 'pdf' : 'csv'}`;
    await $app.Store().Set(filePath, fileContent);
    
    // Update report status
    const report = await $app.Dao().FindRecordById('reports', reportId);
    report.Set('status', 'completed');
    report.Set('filePath', filePath);
    report.Set('completedAt', new Date());
    await $app.Dao().SaveRecord(report);
    
    // Cache for 24 hours
    $app.Cache().Set(`report:${reportId}`, filePath, 86400);
    
  } catch (error) {
    const report = await $app.Dao().FindRecordById('reports', reportId);
    report.Set('status', 'failed');
    report.Set('errorMessage', error.message);
    await $app.Dao().SaveRecord(report);
  }
};

// Endpoint to check report status
routerAdd("GET", "/api/reports/:reportId", async (c) => {
  const reportId = c.PathParam("reportId");
  const report = await $app.Dao().FindRecordById('reports', reportId);
  
  // Verify ownership
  if (report.Get('userId') !== c.Get('userId')) {
    return c.JSON(403, { error: 'Unauthorized' });
  }
  
  return c.JSON(200, {
    id: report.id,
    status: report.Get('status'),
    filePath: report.Get('filePath'),
    completedAt: report.Get('completedAt'),
    errorMessage: report.Get('errorMessage')
  });
});

// Download report
routerAdd("GET", "/api/reports/:reportId/download", async (c) => {
  const reportId = c.PathParam("reportId");
  const report = await $app.Dao().FindRecordById('reports', reportId);
  
  if (report.Get('status') !== 'completed') {
    return c.JSON(400, { error: 'Report not ready' });
  }
  
  const filePath = report.Get('filePath');
  const fileContent = await $app.Store().Get(filePath);
  
  // Set download headers
  c.Response().Header().Set('Content-Disposition', `attachment; filename="${reportId}.pdf"`);
  c.Response().Header().Set('Content-Type', 'application/pdf');
  
  return c.Blob(200, "application/pdf", fileContent);
});
```

### 4.2 Batch Report Generation

```javascript
// Generate all reports for active users nightly
cronAdd(
  "nightly_reports",
  "0 1 * * *", // 1 AM daily
  async () => {
    const activeUsers = await $app.Dao().FindRecordsByFilter(
      'users',
      "lastLoginAt >= @date",
      {
        '@date': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    );
    
    for (const user of activeUsers.Items) {
      // Pre-generate common reports
      await generateReportAsync(
        `auto_${user.id}_monthly`,
        user.id,
        'income_statement',
        getFirstDayOfMonth(),
        getTodayDate()
      );
    }
  }
);
```

### 4.3 Report Caching Strategy

```javascript
// Cache common reports
const getCachedReport = async (userId: string, reportType: string, dateRange: string) => {
  const cacheKey = `report:${userId}:${reportType}:${dateRange}`;
  
  // Check if cached
  const cached = $app.Cache().Get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Generate and cache for 4 hours
  const report = await generateReportData(userId, reportType, dateRange);
  $app.Cache().Set(cacheKey, JSON.stringify(report), 14400);
  
  return report;
};

// Invalidate on transaction changes
onRecordAfterCreateRequest((c) => {
  if (c.Record.Collection == "transactions") {
    const userId = c.Record.Get("userId");
    // Invalidate all reports for this user
    $app.Cache().Remove(`report:${userId}:*`);
  }
}, "transactions");
```

---

## 5. Search Performance

### 5.1 Full-Text Search with PostgreSQL

**Strategy:** Use PostgreSQL GIN indexes for fast search

```sql
-- Full-text search index (already defined)
CREATE INDEX idx_transactions_search ON transactions USING GIN (
  to_tsvector('english', description || ' ' || COALESCE(merchant, ''))
);
```

**Query Implementation:**
```javascript
// Search transactions
const searchTransactions = async (userId: string, query: string, limit = 50) => {
  const results = await db.$queryRaw`
    SELECT 
      id,
      description,
      merchant,
      amount,
      transactionDate,
      ts_rank(
        to_tsvector('english', description || ' ' || COALESCE(merchant, '')),
        plainto_tsquery('english', ${query})
      ) as relevance
    FROM transactions
    WHERE userId = ${userId}
      AND to_tsvector('english', description || ' ' || COALESCE(merchant, ''))
        @@ plainto_tsquery('english', ${query})
    ORDER BY relevance DESC, transactionDate DESC
    LIMIT ${limit}
  `;
  
  return results;
};

// Optimize search with indexing
cronAdd(
  "analyze_search_index",
  "0 3 * * 0", // Weekly at 3 AM
  async () => {
    await db.$queryRaw`ANALYZE transactions`;
  }
);
```

### 5.2 Search Query Optimization

```javascript
// Implement fuzzy search for typos
const fuzzySearchTransactions = async (
  userId: string,
  query: string,
  fuzziness = 0.8
) => {
  const results = await db.$queryRaw`
    SELECT 
      id,
      description,
      amount,
      transactionDate,
      similarity(description, ${query}) as score
    FROM transactions
    WHERE userId = ${userId}
      AND similarity(description, ${query}) > ${fuzziness}
    ORDER BY score DESC
    LIMIT 50
  `;
  
  return results;
};

// Multi-field search
const advancedSearch = async (
  userId: string,
  filters: {
    query?: string;
    category?: string;
    amountMin?: number;
    amountMax?: number;
    dateFrom?: Date;
    dateTo?: Date;
  }
) => {
  let query = db.transaction.findMany({
    where: { userId }
  });
  
  if (filters.query) {
    query = query.where({
      OR: [
        { description: { contains: filters.query, mode: 'insensitive' } },
        { merchant: { contains: filters.query, mode: 'insensitive' } }
      ]
    });
  }
  
  if (filters.category) {
    query = query.where({ categoryId: filters.category });
  }
  
  if (filters.amountMin || filters.amountMax) {
    query = query.where({
      amount: {
        ...(filters.amountMin && { gte: filters.amountMin }),
        ...(filters.amountMax && { lte: filters.amountMax })
      }
    });
  }
  
  if (filters.dateFrom || filters.dateTo) {
    query = query.where({
      transactionDate: {
        ...(filters.dateFrom && { gte: filters.dateFrom }),
        ...(filters.dateTo && { lte: filters.dateTo })
      }
    });
  }
  
  return query.take(100);
};
```

---

## 6. Real-Time Updates Strategy

### 6.1 WebSockets vs Polling

**Strategy:** Use PocketBase real-time subscriptions for efficient updates

```javascript
// Client-side: Subscribe to transaction changes
const subscribeToTransactions = (userId: string, callback: Function) => {
  const unsubscribe = pb
    .collection('transactions')
    .subscribe('*', (data) => {
      // Only process if user's own data
      if (data.record.userId === userId) {
        callback(data);
      }
    });
  
  return unsubscribe;
};

// Frontend component with real-time updates
import { useEffect, useState } from 'react';

export function TransactionList({ userId }) {
  const [transactions, setTransactions] = useState([]);
  
  useEffect(() => {
    // Initial fetch
    fetchTransactions();
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToTransactions(userId, (data) => {
      if (data.action === 'create') {
        setTransactions(prev => [data.record, ...prev]);
      } else if (data.action === 'update') {
        setTransactions(prev =>
          prev.map(t => t.id === data.record.id ? data.record : t)
        );
      } else if (data.action === 'delete') {
        setTransactions(prev => prev.filter(t => t.id !== data.record.id));
      }
    });
    
    return () => unsubscribe();
  }, [userId]);
  
  return (
    <div>
      {transactions.map(t => (
        <TransactionRow key={t.id} transaction={t} />
      ))}
    </div>
  );
}
```

**Polling Fallback (if WebSocket fails):**
```javascript
// Fallback polling with exponential backoff
const pollTransactions = async (userId: string) => {
  let pollInterval = 5000; // Start at 5 seconds
  const maxInterval = 60000; // Max 60 seconds
  
  const poll = async () => {
    try {
      const data = await fetchTransactionsUpdatedSince(userId, lastCheck);
      
      if (data.length > 0) {
        handleUpdates(data);
        pollInterval = 5000; // Reset on success
      } else {
        pollInterval = Math.min(pollInterval * 1.5, maxInterval);
      }
    } catch (error) {
      pollInterval = Math.min(pollInterval * 2, maxInterval);
    }
    
    setTimeout(poll, pollInterval);
  };
  
  return poll;
};
```

### 6.2 Connection Management

```javascript
// backend/pb_hooks/websocket.pb.js

// Track active connections per user
const activeConnections: Record<string, number> = {};

onRecordBeforeSubscribeRequest((c) => {
  const userId = c.AuthRecord().Id;
  
  activeConnections[userId] = (activeConnections[userId] || 0) + 1;
  console.log(`User ${userId} connected. Total connections: ${activeConnections[userId]}`);
});

onRecordAfterUnsubscribeRequest((c) => {
  const userId = c.AuthRecord().Id;
  
  activeConnections[userId] = Math.max(0, (activeConnections[userId] || 0) - 1);
  console.log(`User ${userId} disconnected. Total connections: ${activeConnections[userId]}`);
});

// Monitor connection health
cronAdd(
  "monitor_connections",
  "*/5 * * * *", // Every 5 minutes
  async () => {
    const totalConnections = Object.values(activeConnections).reduce((a, b) => a + b, 0);
    console.log(`Total WebSocket connections: ${totalConnections}`);
  }
);
```

---

## 7. Monitoring & Performance Metrics

### 7.1 Frontend Performance Monitoring

```javascript
// src/utils/performanceMonitoring.ts
import { useEffect } from 'react';

export function usePerformanceMonitoring() {
  useEffect(() => {
    // Wait for page to be fully loaded
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0];
      
      if (perfData) {
        const metrics = {
          // Core Web Vitals
          LCP: getLCP(), // Largest Contentful Paint
          FID: getFID(), // First Input Delay
          CLS: getCLS(), // Cumulative Layout Shift
          
          // Page timing metrics
          DNS: perfData.domainLookupEnd - perfData.domainLookupStart,
          TCP: perfData.connectEnd - perfData.connectStart,
          TTFB: perfData.responseStart - perfData.requestStart,
          FCP: perfData.domInteractive - perfData.fetchStart,
          DOM: perfData.domComplete - perfData.domInteractive,
          Load: perfData.loadEventEnd - perfData.loadEventStart,
          
          // Total times
          TimeToInteractive: perfData.domInteractive - perfData.fetchStart,
          PageLoadTime: perfData.loadEventEnd - perfData.fetchStart
        };
        
        // Send to monitoring service
        sendMetrics(metrics);
        
        // Log in development
        if (process.env.NODE_ENV === 'development') {
          console.table(metrics);
        }
      }
    });
  }, []);
}

// Implementation in root component
import { usePerformanceMonitoring } from './utils/performanceMonitoring';

export default function App() {
  usePerformanceMonitoring();
  
  return (
    // ...
  );
}
```

**Send metrics to backend:**
```javascript
const sendMetrics = async (metrics: Record<string, number>) => {
  try {
    await fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        ...metrics
      })
    });
  } catch (error) {
    console.error('Failed to send metrics:', error);
  }
};
```

### 7.2 Backend Performance Logging

```javascript
// backend/pb_hooks/middleware.pb.js

// Log API response times
routerAdd(".*", "", (c) => {
  const start = Date.now();
  
  // Continue to next handler
  c.Next();
  
  const duration = Date.now() - start;
  const method = c.Request().Method;
  const path = c.Request().URL.Path;
  const status = c.Response().Status;
  
  // Log slow requests (> 200ms)
  if (duration > 200) {
    console.warn(`SLOW REQUEST: ${method} ${path} - ${status} (${duration}ms)`);
  }
  
  // Send to monitoring
  recordMetric({
    path,
    method,
    status,
    duration,
    timestamp: new Date()
  });
}, null);

// Store metrics in time-series collection
const recordMetric = async (metric: {
  path: string;
  method: string;
  status: number;
  duration: number;
  timestamp: Date;
}) => {
  // Insert into metrics collection with 1-minute TTL
  const doc = new DynamicModel({
    collectionId: 'metrics',
    ...metric
  });
  
  await $app.Dao().SaveRecord(doc);
};
```

### 7.3 Database Query Monitoring

```sql
-- Enable query logging in PostgreSQL
ALTER DATABASE finance_production SET log_min_duration_statement = 100; -- Log queries > 100ms

-- View slow query log
SELECT 
  mean_time,
  calls,
  query
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Clear query statistics
SELECT pg_stat_statements_reset();
```

### 7.4 Monitoring Dashboard Queries

```javascript
// Create metrics collection in PocketBase
// backend/pb_hooks/metrics.pb.js

// Aggregate metrics for dashboard
routerAdd("GET", "/api/metrics/summary", async (c) => {
  const timePeriod = c.QueryParam("period") || "1h";
  
  const metrics = await $app.Dao()
    .FindRecordsByFilter(
      'metrics',
      `timestamp >= @timestamp`,
      {
        '@timestamp': getTimeAgo(timePeriod)
      }
    );
  
  // Calculate percentiles
  const durations = metrics.Items
    .map((m: any) => m.Get('duration'))
    .sort((a: number, b: number) => a - b);
  
  const summary = {
    totalRequests: metrics.Items.length,
    avgResponseTime: average(durations),
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
    p99: percentile(durations, 99),
    errorRate: metrics.Items.filter((m: any) => m.Get('status') >= 400).length / metrics.Items.length
  };
  
  return c.JSON(200, summary);
});
```

---

## 8. Load Testing & Capacity Planning

### 8.1 Load Testing Strategy

```bash
# Use k6 for load testing
# load-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },    // Ramp up
    { duration: '5m', target: 100 },    // Hold
    { duration: '2m', target: 200 },    // Spike
    { duration: '5m', target: 200 },    // Hold
    { duration: '2m', target: 0 },      // Ramp down
  ],
};

export default function () {
  // Test dashboard load
  let response = http.get('https://app.budgettool.dev/api/dashboard');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(2);
  
  // Test transactions list
  response = http.get('https://app.budgettool.dev/api/transactions?limit=50');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  sleep(2);
}

// Run with: k6 run load-test.js
```

**Expected Results:**
- < 100 users: Sub-second response times
- 100-500 users: < 500ms p95 response time
- 500-1000 users: Requires horizontal scaling (multiple app instances)

### 8.2 Capacity Planning

```
Single DigitalOcean Droplet Capacity:
- CPU: 1-2 cores
- RAM: 2-4GB
- Concurrent Users: 500-1000
- Peak Transactions/sec: 10-20

Scaling recommendations:
- At 1000 users: Add load balancer + 2 app instances
- At 5000 users: Add database read replicas
- At 10000+ users: Implement CDN + sharding strategy
```

---

## 9. Deployment & Production Checklist

### 9.1 Pre-Production Optimization Checklist

- [ ] Run Lighthouse audit (target score > 90)
- [ ] Enable gzip compression in Nginx
- [ ] Configure HTTP/2 and HTTP/3
- [ ] Set up CDN for static assets
- [ ] Enable browser caching (static files: 1 year, HTML: must-revalidate)
- [ ] Minify CSS, JavaScript, and HTML
- [ ] Optimize and compress images
- [ ] Implement code splitting and lazy loading
- [ ] Set up Redis caching layer
- [ ] Configure database connection pooling
- [ ] Add database indexes (already done)
- [ ] Enable query result caching
- [ ] Set up materialized views for reports
- [ ] Configure rate limiting (100 req/min per user)
- [ ] Enable CORS headers appropriately
- [ ] Set Content Security Policy headers
- [ ] Enable monitoring and alerting
- [ ] Load test with k6 (minimum 500 concurrent users)
- [ ] Run SQL EXPLAIN on critical queries
- [ ] Monitor resource usage (CPU, RAM, disk)

### 9.2 Production Monitoring Setup

```nginx
# nginx.conf - Add monitoring endpoints
location /metrics {
  proxy_pass http://backend:3001/metrics;
  access_log off;
}

location /health {
  access_log off;
  return 200 "healthy\n";
  add_header Content-Type text/plain;
}
```

```javascript
// backend/pb_hooks/health.pb.js
routerAdd("GET", "/api/health", (c) => {
  return c.JSON(200, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: checkDatabaseHealth()
  });
});
```

---

## 10. Performance Targets Summary

### Frontend Metrics
| Metric | Target | Priority |
|--------|--------|----------|
| LCP (Largest Contentful Paint) | < 2.5s | Critical |
| INP (Interaction to Next Paint) | < 200ms | Critical |
| CLS (Cumulative Layout Shift) | < 0.1 | High |
| Initial Bundle Size | < 150KB (gzipped) | High |
| First Paint (FP) | < 1s | High |
| Time to Interactive | < 3.5s | Medium |

### Backend Metrics
| Metric | Target | Priority |
|--------|--------|----------|
| API Response Time (p95) | < 200ms | Critical |
| Database Query Time (p95) | < 100ms | Critical |
| Cache Hit Rate | > 80% | High |
| Error Rate (5xx) | < 0.1% | High |
| Uptime | > 99.9% | Critical |

### Database Metrics
| Metric | Target | Priority |
|--------|--------|----------|
| Connection Pool Usage | < 80% | High |
| Query Execution Time (p95) | < 100ms | Critical |
| Slow Query Threshold | > 200ms logged | Medium |
| Index Usage | > 95% | High |
| Table Bloat | < 10% | Medium |

---

## 11. Implementation Timeline

### Phase 1: Immediate (Week 1)
- [ ] Enable gzip compression
- [ ] Configure browser caching headers
- [ ] Add database indexes (already done)
- [ ] Implement connection pooling monitoring
- [ ] Set up frontend performance monitoring

### Phase 2: Short-term (Weeks 2-3)
- [ ] Implement code splitting and lazy loading
- [ ] Set up Redis caching layer
- [ ] Optimize images (convert to WebP/AVIF)
- [ ] Implement pagination
- [ ] Set up dashboard metrics collection

### Phase 3: Medium-term (Weeks 4-6)
- [ ] Create materialized views for reports
- [ ] Implement async report generation
- [ ] Set up search optimization
- [ ] Configure CDN for static assets
- [ ] Load test and capacity planning

### Phase 4: Long-term (Ongoing)
- [ ] Monitor and optimize based on real-world usage
- [ ] Implement query result caching
- [ ] Set up full-text search optimization
- [ ] Plan for horizontal scaling
- [ ] Regular index maintenance and optimization

---

## Conclusion

This comprehensive performance optimization strategy provides a roadmap for building a fast, scalable personal finance platform. Key success factors:

1. **Monitor constantly** - Use real performance data to drive decisions
2. **Iterate incrementally** - Implement optimizations phase by phase
3. **Test thoroughly** - Validate improvements with load testing
4. **Plan for scale** - Design architecture that grows with users

By following this strategy, the platform can handle thousands of users with response times under 200ms and maintain excellent Core Web Vitals scores.
