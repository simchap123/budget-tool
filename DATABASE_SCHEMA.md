# Database Schema

## Overview

PostgreSQL schema for the personal finance platform. All tables include:
- `id` (UUID primary key)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- `userId` (foreign key to users table for multi-tenancy)

## Core Tables

### Users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar VARCHAR(500),
  
  -- Account settings
  currency VARCHAR(3) DEFAULT 'USD',
  timezone VARCHAR(50) DEFAULT 'UTC',
  theme VARCHAR(20) DEFAULT 'dark',
  
  -- Account status
  emailVerified BOOLEAN DEFAULT FALSE,
  emailVerificationToken VARCHAR(255),
  emailVerificationExpiry TIMESTAMP,
  
  passwordResetToken VARCHAR(255),
  passwordResetExpiry TIMESTAMP,
  
  -- Metadata
  lastLoginAt TIMESTAMP,
  onboardingCompleted BOOLEAN DEFAULT FALSE,
  
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

### Accounts (Bank/Financial Accounts)
```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Account info
  name VARCHAR(255) NOT NULL,
  accountType VARCHAR(50) NOT NULL, -- checking, savings, credit_card, investment, loan
  institutionName VARCHAR(255),
  accountNumber VARCHAR(255), -- masked or last 4 digits
  routingNumber VARCHAR(255),
  
  -- Plaid integration
  plaidAccountId VARCHAR(255), -- unique account ID from Plaid
  plaidAccessToken VARCHAR(500), -- encrypted
  plaidInstitutionId VARCHAR(255),
  plaidSyncCursor VARCHAR(255), -- for incremental sync
  
  -- Balance tracking
  currentBalance DECIMAL(15,2),
  lastSyncAt TIMESTAMP,
  
  -- Status
  isActive BOOLEAN DEFAULT TRUE,
  isClosed BOOLEAN DEFAULT FALSE,
  
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_user_account UNIQUE(userId, name),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_accounts_userId ON accounts(userId);
CREATE INDEX idx_accounts_plaidAccountId ON accounts(plaidAccountId);
```

### Transactions
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  accountId UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  
  -- Transaction details
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  type VARCHAR(20) NOT NULL, -- income, expense, transfer
  
  -- Categorization
  categoryId UUID REFERENCES categories(id) ON DELETE SET NULL,
  subcategoryId UUID REFERENCES subcategories(id) ON DELETE SET NULL,
  
  -- Dates
  transactionDate DATE NOT NULL,
  postedDate DATE,
  
  -- Source tracking
  source VARCHAR(50), -- plaid, csv, manual, api
  sourceId VARCHAR(255), -- external ID from source
  
  -- Plaid fields
  plaidTransactionId VARCHAR(255),
  plaidMerchantName VARCHAR(255),
  
  -- Transaction details
  merchant VARCHAR(255),
  notes TEXT,
  tags VARCHAR(255)[], -- array of tags
  
  -- Split transactions
  isSplit BOOLEAN DEFAULT FALSE,
  parentTransactionId UUID REFERENCES transactions(id) ON DELETE CASCADE,
  
  -- Reconciliation
  isReconciled BOOLEAN DEFAULT FALSE,
  reconcileDate TIMESTAMP,
  
  -- Flags
  isDuplicate BOOLEAN DEFAULT FALSE,
  duplicateOf UUID REFERENCES transactions(id),
  
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX idx_transactions_userId ON transactions(userId);
CREATE INDEX idx_transactions_accountId ON transactions(accountId);
CREATE INDEX idx_transactions_categoryId ON transactions(categoryId);
CREATE INDEX idx_transactions_transactionDate ON transactions(transactionDate);
CREATE INDEX idx_transactions_sourceId ON transactions(sourceId);
CREATE INDEX idx_transactions_plaidTransactionId ON transactions(plaidTransactionId);

-- Full-text search on description and merchant
CREATE INDEX idx_transactions_search ON transactions USING GIN (
  to_tsvector('english', description || ' ' || COALESCE(merchant, ''))
);
```

### Categories
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Category info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7), -- hex color
  icon VARCHAR(50), -- icon name
  
  -- Categorization
  tier VARCHAR(50), -- tier_1, tier_2, tier_3 from Maaser
  parentCategoryId UUID REFERENCES categories(id),
  
  -- Visibility
  isDefault BOOLEAN DEFAULT FALSE,
  isActive BOOLEAN DEFAULT TRUE,
  isCustom BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  displayOrder INT DEFAULT 0,
  
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_user_category UNIQUE(userId, name),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_categories_userId ON categories(userId);
CREATE INDEX idx_categories_parentCategoryId ON categories(parentCategoryId);
```

### Subcategories
```sql
CREATE TABLE subcategories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  categoryId UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  
  -- Subcategory info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Status
  isActive BOOLEAN DEFAULT TRUE,
  displayOrder INT DEFAULT 0,
  
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_subcategory UNIQUE(categoryId, name),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE INDEX idx_subcategories_userId ON subcategories(userId);
CREATE INDEX idx_subcategories_categoryId ON subcategories(categoryId);
```

### Categorization Rules
```sql
CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Rule info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Matching criteria
  pattern VARCHAR(500) NOT NULL, -- regex pattern for matching
  matchType VARCHAR(50), -- contains, equals, regex, startsWith, endsWith
  searchField VARCHAR(50), -- description, merchant, amount
  
  -- Action
  categoryId UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  subcategoryId UUID REFERENCES subcategories(id) ON DELETE SET NULL,
  autoApply BOOLEAN DEFAULT TRUE,
  
  -- Status
  isActive BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 0, -- higher priority applied first
  
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (categoryId) REFERENCES categories(id)
);

CREATE INDEX idx_rules_userId ON rules(userId);
CREATE INDEX idx_rules_categoryId ON rules(categoryId);
CREATE INDEX idx_rules_priority ON rules(priority DESC);
```

### Budgets
```sql
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Budget info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Period
  year INT NOT NULL,
  month INT, -- 1-12, NULL for yearly budget
  
  -- Categories
  categoryId UUID REFERENCES categories(id) ON DELETE CASCADE,
  
  -- Budget amount
  budgetAmount DECIMAL(15,2) NOT NULL,
  alertThreshold DECIMAL(3,2) DEFAULT 0.80, -- alert at 80%
  
  -- Status
  isActive BOOLEAN DEFAULT TRUE,
  
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_budget_period UNIQUE(userId, year, month, categoryId),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_budgets_userId ON budgets(userId);
CREATE INDEX idx_budgets_period ON budgets(year, month);
```

### Savings Goals
```sql
CREATE TABLE savings_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Goal info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- vacation, emergency, home, education, etc
  
  -- Target
  targetAmount DECIMAL(15,2) NOT NULL,
  currentAmount DECIMAL(15,2) DEFAULT 0,
  
  -- Timeline
  targetDate DATE NOT NULL,
  
  -- Status
  isActive BOOLEAN DEFAULT TRUE,
  completedAt TIMESTAMP,
  
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_goals_userId ON savings_goals(userId);
```

### Imported Statements
```sql
CREATE TABLE imported_statements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  accountId UUID REFERENCES accounts(id) ON DELETE SET NULL,
  
  -- File info
  filename VARCHAR(500) NOT NULL,
  fileSize INT, -- in bytes
  filePath VARCHAR(500),
  
  -- Import details
  format VARCHAR(20), -- csv, ofx, qfx, json
  rowCount INT,
  importedRowCount INT,
  
  -- Deduplication
  duplicatesFound INT DEFAULT 0,
  duplicateHandling VARCHAR(50), -- skip, replace, prompt
  
  -- Status
  status VARCHAR(50), -- pending, processing, completed, failed
  errorMessage TEXT,
  
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (accountId) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE INDEX idx_statements_userId ON imported_statements(userId);
CREATE INDEX idx_statements_accountId ON imported_statements(accountId);
```

### Financial Reports (Cache)
```sql
CREATE TABLE financial_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Report details
  reportType VARCHAR(50), -- income_statement, budget_vs_actual, cash_flow
  dateRange VARCHAR(50), -- monthly, quarterly, yearly, custom
  
  -- Date range
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  
  -- Report data (JSON)
  data JSONB NOT NULL,
  
  -- Metadata
  generatedAt TIMESTAMP DEFAULT NOW(),
  expiresAt TIMESTAMP,
  
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_reports_userId ON financial_reports(userId);
CREATE INDEX idx_reports_dateRange ON financial_reports(startDate, endDate);
```

### Audit Log
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Action details
  action VARCHAR(255) NOT NULL, -- created, updated, deleted, exported
  entityType VARCHAR(100), -- transactions, categories, budgets
  entityId VARCHAR(255),
  
  -- Changes
  changes JSONB, -- before/after values
  
  -- Request info
  ipAddress INET,
  userAgent VARCHAR(500),
  
  createdAt TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_logs_userId ON audit_logs(userId);
CREATE INDEX idx_audit_logs_createdAt ON audit_logs(createdAt);
CREATE INDEX idx_audit_logs_entityId ON audit_logs(entityId);
```

### API Keys (for programmatic access)
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Key
  keyHash VARCHAR(255) NOT NULL UNIQUE, -- hashed for security
  displayKey VARCHAR(50) NOT NULL, -- last 8 chars for display
  
  -- Permissions
  permissions TEXT[], -- array of permission strings
  
  -- Status
  isActive BOOLEAN DEFAULT TRUE,
  lastUsedAt TIMESTAMP,
  
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_keys_userId ON api_keys(userId);
```

## Indexes & Performance

### Composite Indexes
```sql
-- For dashboard queries
CREATE INDEX idx_transactions_user_date 
  ON transactions(userId, transactionDate DESC);

-- For category spending analysis
CREATE INDEX idx_transactions_category_date 
  ON transactions(userId, categoryId, transactionDate DESC);

-- For budget tracking
CREATE INDEX idx_transactions_account_category 
  ON transactions(accountId, categoryId, transactionDate DESC);
```

## Constraints

### Foreign Key Constraints
- All user-owned records cascade delete on user deletion
- Transactions cascade delete on account deletion
- Rules cascade delete on category deletion

### Unique Constraints
- `users.email` - unique email per system
- `accounts(userId, name)` - unique account name per user
- `categories(userId, name)` - unique category name per user
- `budgets(userId, year, month, categoryId)` - one budget per period/category
- `api_keys.keyHash` - unique API key

## Data Types

| Type | Usage |
|------|-------|
| UUID | Primary keys, foreign keys |
| DECIMAL(15,2) | Money amounts (cents precision) |
| DATE | Transaction dates, budget dates |
| TIMESTAMP | Audit, sync, status tracking |
| JSONB | Flexible data (reports, changes) |
| TEXT[] | Tags, permissions, category lists |
| INET | IP addresses (audit logs) |

## Encryption

Sensitive fields encrypted at application level before storage:
- `accounts.accountNumber`
- `accounts.routingNumber`
- `accounts.plaidAccessToken`
- `users.passwordHash` (bcrypt hashed, not encrypted)

## Migrations

Migrations managed by Prisma (`prisma/migrations/`)

### Initial Setup
1. Create schema
2. Create indexes
3. Create extensions
4. Seed default categories

### Future Migrations
- Add/modify columns
- Create new tables
- Update indexes
- Data transformations

## Backup Strategy

### Daily Backups
```bash
pg_dump finance_production | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Retention
- 30 days of daily backups
- Stored in DigitalOcean Spaces
- Automated restoration testing

## Scaling Considerations

### Partitioning
Future: Partition `transactions` table by date for improved query performance
```sql
CREATE TABLE transactions_2024_q1 PARTITION OF transactions
  FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
```

### Read Replicas
Future: Set up PostgreSQL read replicas for reporting queries
