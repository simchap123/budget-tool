# Migration Technical Reference
## Complete Configuration & Implementation Guide

**Related Documents**:
- `MIGRATION_PLAN.md` - Main migration strategy
- `MIGRATION_QUICK_START.md` - Quick overview

---

## Table of Contents

1. [Complete Prisma Schema](#1-complete-prisma-schema)
2. [Database Initialization](#2-database-initialization)
3. [Migration Scripts](#3-migration-scripts)
4. [Environment Configuration](#4-environment-configuration)
5. [API Implementation Examples](#5-api-implementation-examples)
6. [Monitoring & Alerting](#6-monitoring--alerting)
7. [Backup & Recovery Scripts](#7-backup--recovery-scripts)

---

## 1. Complete Prisma Schema

**File**: `backend/prisma/schema.prisma`

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==========================================
// Core User Model
// ==========================================

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  username        String    @unique
  passwordHash    String    @db.Text
  firstName       String?
  lastName        String?
  
  // Profile
  avatar          String?
  timezone        String?   @default("UTC")
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  lastLoginAt     DateTime?
  deletedAt       DateTime?
  
  // Relations
  accounts        Account[]
  transactions    Transaction[]
  categories      Category[]
  rules           Rule[]
  statements      Statement[]
  auditLogs       AuditLog[]

  @@index([email])
  @@index([createdAt])
  @@fulltext([email, username]) // Optional: for search
}

// ==========================================
// Bank Accounts (Plaid Integration)
// ==========================================

model Account {
  id                  String    @id @default(cuid())
  userId              String
  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Plaid Integration
  plaidAccountId      String?   @unique
  plaidInstitutionId  String?
  institutionName     String?
  
  // Account Details
  accountName         String
  accountType         String    // checking, savings, credit, investment, loan, mortgage
  mask                String?   // Last 4 digits
  
  // Balance & Currency
  balance             Decimal   @db.Decimal(12, 2)
  currency            String    @default("USD")
  
  // Sync Status
  lastSyncedAt        DateTime?
  syncStatus          String    @default("pending") // pending, syncing, synced, error
  syncError           String?
  
  // Timestamps
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  
  // Relations
  transactions        Transaction[]

  @@unique([userId, plaidAccountId])
  @@index([userId])
  @@index([plaidAccountId])
  @@index([lastSyncedAt])
}

// ==========================================
// Transactions
// ==========================================

model Transaction {
  id                  String    @id @default(cuid())
  userId              String
  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  accountId           String
  account             Account   @relation(fields: [accountId], references: [id], onDelete: Cascade)
  
  // Transaction Details
  date                DateTime  @db.Timestamp
  amount              Decimal   @db.Decimal(12, 2)
  merchant            String?
  description         String
  notes               String?
  
  // Categorization
  categoryId          String?
  category            Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  
  // AI Metadata
  aiConfidence        Float?    @db.Real // 0.0-1.0
  aiCategoryId        String?   // Original AI suggestion
  aiCategoryConfidence Float?
  
  // Plaid Integration
  plaidTransactionId  String?
  plaidId             String?
  
  // Status & Reconciliation
  status              String    @default("pending") // pending, cleared, reconciled
  isReconciled        Boolean   @default(false)
  reconciledAt        DateTime?
  
  // User Customization
  isHidden            Boolean   @default(false)
  tags                String[]  @default([])
  
  // Timestamps
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@unique([userId, plaidTransactionId])
  @@index([userId])
  @@index([accountId])
  @@index([categoryId])
  @@index([date])
  @@index([merchant])
  @@index([status])
  @@index([createdAt])
}

// ==========================================
// Categories
// ==========================================

model Category {
  id                  String    @id @default(cuid())
  userId              String
  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Category Details
  name                String
  description         String?
  color               String    @default("#64748B") // Hex color
  icon                String?   // Icon name/emoji
  
  // Type
  type                String    @default("expense") // income, expense
  isSystem            Boolean   @default(false) // Built-in vs. custom
  isCustom            Boolean   @default(true)
  
  // Display
  isActive            Boolean   @default(true)
  displayOrder        Int?      // For custom sorting
  
  // Metadata
  parentCategoryId    String?   // For nested categories
  parentCategory      Category? @relation("CategoryHierarchy", fields: [parentCategoryId], references: [id], onDelete: SetNull)
  childCategories     Category[] @relation("CategoryHierarchy")
  
  // Timestamps
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  
  // Relations
  transactions        Transaction[]
  rules               Rule[]

  @@unique([userId, name])
  @@index([userId])
  @@index([type])
  @@index([isActive])
}

// ==========================================
// Categorization Rules
// ==========================================

model Rule {
  id                  String    @id @default(cuid())
  userId              String
  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Rule Configuration
  type                String    // keyword, merchant_pattern, amount_range, regex
  pattern             String    @db.Text // Pattern to match
  targetCategoryId    String
  targetCategory      Category  @relation(fields: [targetCategoryId], references: [id], onDelete: Cascade)
  
  // Confidence & Performance
  confidence          Float     @default(0.8) @db.Real // 0.0-1.0
  accuracy            Float?    @db.Real // After applying rule
  
  // Status
  active              Boolean   @default(true)
  priority            Int       @default(0) // Higher = checked first
  
  // Statistics
  timesApplied        Int       @default(0)
  timesCorrect        Int       @default(0)
  lastAppliedAt       DateTime?
  
  // Options
  caseSensitive       Boolean   @default(false)
  wholeMatch          Boolean   @default(false)
  
  // Timestamps
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@index([userId])
  @@index([active])
  @@index([priority])
}

// ==========================================
// Financial Statements (Reports)
// ==========================================

model Statement {
  id                  String    @id @default(cuid())
  userId              String
  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Period
  periodStart         DateTime
  periodEnd           DateTime
  periodType          String    @default("monthly") // monthly, quarterly, yearly
  
  // Statement Data (JSON structure)
  data                Json      // Income statement data
  // Example structure:
  // {
  //   "income": { "salary": 5000, "bonus": 1000, ... },
  //   "expenses": { "rent": 1500, "food": 400, ... },
  //   "netIncome": 3600,
  //   "categoryBreakdown": { ... }
  // }
  
  // Metadata
  isGenerated         Boolean   @default(true)
  generatedAt         DateTime  @default(now())
  
  // Timestamps
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@unique([userId, periodStart, periodEnd, periodType])
  @@index([userId])
  @@index([periodStart])
  @@index([periodEnd])
}

// ==========================================
// Audit Logs (Change Tracking)
// ==========================================

model AuditLog {
  id                  String    @id @default(cuid())
  userId              String
  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Change Details
  collection          String    // Table name
  action              String    // create, update, delete, merge
  recordId            String    // ID of changed record
  
  // Changes (before/after)
  changes             Json?     // { "fieldName": { "before": old, "after": new }, ... }
  
  // Metadata
  ipAddress           String?
  userAgent           String?
  reason              String?   // Why the change was made
  
  // Timestamps
  createdAt           DateTime  @default(now())
  
  @@index([userId])
  @@index([collection])
  @@index([action])
  @@index([createdAt])
  @@index([recordId])
}

// ==========================================
// Indexes & Search Optimization
// ==========================================

// Additional indexes for query performance
// Transaction search
model TransactionSearchIndex {
  id              String    @id @default(cuid())
  transactionId   String    @unique
  userId          String
  searchText      String    @db.Text // Full-text search field
  createdAt       DateTime  @default(now())
  
  @@index([userId])
  @@fulltext([searchText])
}

// ==========================================
// Session Management (if using sessions instead of JWT)
// ==========================================

model Session {
  id            String    @id @default(cuid())
  sessionToken  String    @unique
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expires       DateTime
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([userId])
  @@index([sessionToken])
  @@index([expires])
}
```

### Prisma Migrations

**File**: `backend/prisma/migrations/001_init/migration.sql`

```sql
-- CreateTable users
CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "username" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  "avatar" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastLoginAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3)
);

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateTable accounts
CREATE TABLE "Account" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "plaidAccountId" TEXT UNIQUE,
  "plaidInstitutionId" TEXT,
  "institutionName" TEXT,
  "accountName" TEXT NOT NULL,
  "accountType" TEXT NOT NULL,
  "mask" TEXT,
  "balance" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "lastSyncedAt" TIMESTAMP(3),
  "syncStatus" TEXT NOT NULL DEFAULT 'pending',
  "syncError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex for accounts
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE INDEX "Account_plaidAccountId_idx" ON "Account"("plaidAccountId");
CREATE INDEX "Account_lastSyncedAt_idx" ON "Account"("lastSyncedAt");
CREATE UNIQUE INDEX "Account_userId_plaidAccountId_key" ON "Account"("userId", "plaidAccountId");

-- CreateTable transactions
CREATE TABLE "Transaction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "date" TIMESTAMP NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "merchant" TEXT,
  "description" TEXT NOT NULL,
  "notes" TEXT,
  "categoryId" TEXT,
  "aiConfidence" REAL,
  "aiCategoryId" TEXT,
  "aiCategoryConfidence" REAL,
  "plaidTransactionId" TEXT,
  "plaidId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "isReconciled" BOOLEAN NOT NULL DEFAULT false,
  "reconciledAt" TIMESTAMP(3),
  "isHidden" BOOLEAN NOT NULL DEFAULT false,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex for transactions
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");
CREATE INDEX "Transaction_accountId_idx" ON "Transaction"("accountId");
CREATE INDEX "Transaction_categoryId_idx" ON "Transaction"("categoryId");
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");
CREATE INDEX "Transaction_merchant_idx" ON "Transaction"("merchant");
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");
CREATE UNIQUE INDEX "Transaction_userId_plaidTransactionId_key" ON "Transaction"("userId", "plaidTransactionId");

-- CreateTable categories
CREATE TABLE "Category" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT NOT NULL DEFAULT '#64748B',
  "icon" TEXT,
  "type" TEXT NOT NULL DEFAULT 'expense',
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "isCustom" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER,
  "parentCategoryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Category_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex for categories
CREATE INDEX "Category_userId_idx" ON "Category"("userId");
CREATE INDEX "Category_type_idx" ON "Category"("type");
CREATE INDEX "Category_isActive_idx" ON "Category"("isActive");
CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");

-- CreateTable rules
CREATE TABLE "Rule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "pattern" TEXT NOT NULL,
  "targetCategoryId" TEXT NOT NULL,
  "confidence" REAL NOT NULL DEFAULT 0.8,
  "accuracy" REAL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "timesApplied" INTEGER NOT NULL DEFAULT 0,
  "timesCorrect" INTEGER NOT NULL DEFAULT 0,
  "lastAppliedAt" TIMESTAMP(3),
  "caseSensitive" BOOLEAN NOT NULL DEFAULT false,
  "wholeMatch" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Rule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Rule_targetCategoryId_fkey" FOREIGN KEY ("targetCategoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex for rules
CREATE INDEX "Rule_userId_idx" ON "Rule"("userId");
CREATE INDEX "Rule_active_idx" ON "Rule"("active");
CREATE INDEX "Rule_priority_idx" ON "Rule"("priority");

-- CreateTable statements
CREATE TABLE "Statement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "periodType" TEXT NOT NULL DEFAULT 'monthly',
  "data" JSONB NOT NULL,
  "isGenerated" BOOLEAN NOT NULL DEFAULT true,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Statement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex for statements
CREATE INDEX "Statement_userId_idx" ON "Statement"("userId");
CREATE INDEX "Statement_periodStart_idx" ON "Statement"("periodStart");
CREATE INDEX "Statement_periodEnd_idx" ON "Statement"("periodEnd");
CREATE UNIQUE INDEX "Statement_userId_periodStart_periodEnd_periodType_key" ON "Statement"("userId", "periodStart", "periodEnd", "periodType");

-- CreateTable audit_logs
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "collection" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "changes" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex for audit_logs
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_collection_idx" ON "AuditLog"("collection");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_recordId_idx" ON "AuditLog"("recordId");

-- CreateTable sessions
CREATE TABLE "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex for sessions
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_sessionToken_idx" ON "Session"("sessionToken");
CREATE INDEX "Session_expires_idx" ON "Session"("expires");
```

---

## 2. Database Initialization

### PostgreSQL Connection Setup

**File**: `.env.local`

```env
# Database
DATABASE_URL="postgresql://budgettool_user:secure_password@localhost:5432/budget_tool"

# API
NEXT_PUBLIC_API_URL="http://localhost:3000"
API_SECRET_KEY="your-secret-key-here"

# Authentication
JWT_SECRET="your-jwt-secret-key"
JWT_EXPIRATION="7d"

# External APIs
ANTHROPIC_API_KEY="sk-ant-..."
PLAID_CLIENT_ID="..."
PLAID_SECRET="..."

# Environment
NODE_ENV="development"
DEBUG="false"
```

### Prisma Configuration

**File**: `backend/.env`

```env
DATABASE_URL="postgresql://budgettool_user:secure_password@localhost:5432/budget_tool"
```

### Initialize Database

```bash
# Install dependencies
cd backend
npm install @prisma/client
npm install -D prisma

# Initialize Prisma
npx prisma init

# Create and run migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed database (optional)
npx prisma db seed
```

### Database Seeding

**File**: `backend/prisma/seed.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default categories
  const categories = [
    { name: 'Groceries', type: 'expense', color: '#10b981', icon: '🛒' },
    { name: 'Dining Out', type: 'expense', color: '#f59e0b', icon: '🍽️' },
    { name: 'Transportation', type: 'expense', color: '#3b82f6', icon: '🚗' },
    { name: 'Utilities', type: 'expense', color: '#8b5cf6', icon: '💡' },
    { name: 'Entertainment', type: 'expense', color: '#ec4899', icon: '🎬' },
    { name: 'Healthcare', type: 'expense', color: '#ef4444', icon: '⚕️' },
    { name: 'Salary', type: 'income', color: '#059669', icon: '💰' },
    { name: 'Bonus', type: 'income', color: '#0891b2', icon: '🎁' },
  ];

  // Note: You'll need to associate these with a user
  // This is just an example of how to seed default categories

  console.log(`Seeded ${categories.length} categories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 3. Migration Scripts

### Export from PocketBase

**File**: `backend/scripts/export-pocketbase.ts`

```typescript
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

interface ExportData {
  metadata: {
    exportDate: string;
    sourceSystem: string;
    version: string;
  };
  users: Record<string, unknown>[];
  accounts: Record<string, unknown>[];
  transactions: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  rules: Record<string, unknown>[];
  statements: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
}

export async function exportPocketBase(
  dbPath: string = './backend/pb_data/pb.db'
): Promise<ExportData> {
  console.log(`Opening PocketBase database at ${dbPath}...`);

  const db = new Database(dbPath, { readonly: true });

  const exportData: ExportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      sourceSystem: 'PocketBase',
      version: '1.0',
    },
    users: [],
    accounts: [],
    transactions: [],
    categories: [],
    rules: [],
    statements: [],
    auditLogs: [],
  };

  try {
    // Export users
    console.log('Exporting users...');
    const usersStmt = db.prepare(`
      SELECT id, email, username, password as password_hash, 
             created as created_at, updated as updated_at, verified
      FROM users
    `);
    exportData.users = usersStmt.all() as Record<string, unknown>[];
    console.log(`  ✓ Exported ${exportData.users.length} users`);

    // Export accounts
    console.log('Exporting accounts...');
    const accountsStmt = db.prepare(`
      SELECT id, user_id, plaid_account_id, account_name, account_type,
             balance, institution, last_synced_at,
             created as created_at, updated as updated_at
      FROM accounts
    `);
    exportData.accounts = accountsStmt.all() as Record<string, unknown>[];
    console.log(`  ✓ Exported ${exportData.accounts.length} accounts`);

    // Export transactions
    console.log('Exporting transactions...');
    const txStmt = db.prepare(`
      SELECT id, user_id, account_id, date, amount, merchant, description,
             category_id, status, notes, ai_confidence, ai_category_id,
             plaid_transaction_id,
             created as created_at, updated as updated_at
      FROM transactions
      ORDER BY created ASC
    `);
    const txChunks = [];
    const txCursor = txStmt.iterate();
    for (const row of txCursor) {
      txChunks.push(row);
    }
    exportData.transactions = txChunks as Record<string, unknown>[];
    console.log(`  ✓ Exported ${exportData.transactions.length} transactions`);

    // Export categories
    console.log('Exporting categories...');
    const catsStmt = db.prepare(`
      SELECT id, user_id, name, color, icon, type, is_custom,
             created as created_at, updated as updated_at
      FROM categories
    `);
    exportData.categories = catsStmt.all() as Record<string, unknown>[];
    console.log(`  ✓ Exported ${exportData.categories.length} categories`);

    // Export rules
    console.log('Exporting rules...');
    const rulesStmt = db.prepare(`
      SELECT id, user_id, type, pattern, target_category_id, confidence,
             active, times_applied, last_applied_at,
             created as created_at, updated as updated_at
      FROM rules
    `);
    exportData.rules = rulesStmt.all() as Record<string, unknown>[];
    console.log(`  ✓ Exported ${exportData.rules.length} rules`);

    // Export statements
    console.log('Exporting statements...');
    const stmtsStmt = db.prepare(`
      SELECT id, user_id, period_start, period_end, data,
             created as created_at, updated as updated_at
      FROM statements
    `);
    exportData.statements = stmtsStmt.all() as Record<string, unknown>[];
    console.log(`  ✓ Exported ${exportData.statements.length} statements`);

    // Export audit logs
    console.log('Exporting audit logs...');
    const logsStmt = db.prepare(`
      SELECT id, user_id, collection, action, record_id, changes,
             created as created_at
      FROM audit_logs
      ORDER BY created ASC
    `);
    const logsCursor = logsStmt.iterate();
    const logs = [];
    for (const row of logsCursor) {
      logs.push(row);
    }
    exportData.auditLogs = logs as Record<string, unknown>[];
    console.log(`  ✓ Exported ${exportData.auditLogs.length} audit logs`);

    return exportData;
  } finally {
    db.close();
  }
}

// CLI execution
async function main() {
  try {
    const dbPath = process.argv[2] || './backend/pb_data/pb.db';
    const data = await exportPocketBase(dbPath);

    // Save to file
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = path.join(
      process.cwd(),
      `pocketbase_export_${timestamp}.json`
    );

    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`\n✅ Export complete! Saved to: ${filename}`);

    // Print summary
    console.log('\nExport Summary:');
    console.log(`  Users: ${data.users.length}`);
    console.log(`  Accounts: ${data.accounts.length}`);
    console.log(`  Transactions: ${data.transactions.length}`);
    console.log(`  Categories: ${data.categories.length}`);
    console.log(`  Rules: ${data.rules.length}`);
    console.log(`  Statements: ${data.statements.length}`);
    console.log(`  Audit Logs: ${data.auditLogs.length}`);
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export default exportPocketBase;
```

### Import to PostgreSQL

**File**: `backend/scripts/import-to-postgres.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface ExportData {
  metadata: Record<string, unknown>;
  users: Record<string, unknown>[];
  accounts: Record<string, unknown>[];
  transactions: Record<string, unknown>[];
  categories: Record<string, unknown>[];
  rules: Record<string, unknown>[];
  statements: Record<string, unknown>[];
  auditLogs: Record<string, unknown>[];
}

async function importToPgSQL(exportFile: string, verify: boolean = false) {
  console.log(`📂 Reading export file: ${exportFile}`);
  const rawData = fs.readFileSync(exportFile, 'utf-8');
  const data: ExportData = JSON.parse(rawData);

  console.log(`✅ Export file loaded (${data.metadata.exportDate})\n`);

  let totalImported = 0;
  const errors: { table: string; error: string }[] = [];

  try {
    // 1. Import users
    console.log('👤 Importing users...');
    for (const pbUser of data.users) {
      try {
        const user = await prisma.user.create({
          data: {
            id: (pbUser.id as string) || undefined,
            email: pbUser.email as string,
            username: pbUser.username as string,
            passwordHash: pbUser.password_hash as string,
            createdAt: new Date(pbUser.created_at as string),
            updatedAt: new Date(pbUser.updated_at as string),
          },
        });
        totalImported++;
        process.stdout.write('.');
      } catch (e) {
        errors.push({
          table: 'users',
          error: `User ${pbUser.email}: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }
    console.log(`\n  ✓ Imported ${data.users.length} users\n`);

    // 2. Import accounts
    console.log('🏦 Importing accounts...');
    for (const pbAccount of data.accounts) {
      try {
        await prisma.account.create({
          data: {
            id: (pbAccount.id as string) || undefined,
            userId: pbAccount.user_id as string,
            plaidAccountId: (pbAccount.plaid_account_id as string) || null,
            accountName: pbAccount.account_name as string,
            accountType: pbAccount.account_type as string,
            balance: parseFloat(pbAccount.balance as string),
            institution: (pbAccount.institution as string) || null,
            lastSyncedAt: pbAccount.last_synced_at
              ? new Date(pbAccount.last_synced_at as string)
              : null,
            createdAt: new Date(pbAccount.created_at as string),
            updatedAt: new Date(pbAccount.updated_at as string),
          },
        });
        totalImported++;
        process.stdout.write('.');
      } catch (e) {
        errors.push({
          table: 'accounts',
          error: `Account ${pbAccount.account_name}: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }
    console.log(`\n  ✓ Imported ${data.accounts.length} accounts\n`);

    // 3. Import categories
    console.log('🏷️  Importing categories...');
    for (const pbCategory of data.categories) {
      try {
        await prisma.category.create({
          data: {
            id: (pbCategory.id as string) || undefined,
            userId: pbCategory.user_id as string,
            name: pbCategory.name as string,
            color: pbCategory.color as string,
            icon: (pbCategory.icon as string) || null,
            type: pbCategory.type as string,
            isCustom: (pbCategory.is_custom as boolean) ?? true,
            createdAt: new Date(pbCategory.created_at as string),
            updatedAt: new Date(pbCategory.updated_at as string),
          },
        });
        totalImported++;
        process.stdout.write('.');
      } catch (e) {
        errors.push({
          table: 'categories',
          error: `Category ${pbCategory.name}: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }
    console.log(`\n  ✓ Imported ${data.categories.length} categories\n`);

    // 4. Import rules
    console.log('⚙️  Importing rules...');
    for (const pbRule of data.rules) {
      try {
        await prisma.rule.create({
          data: {
            id: (pbRule.id as string) || undefined,
            userId: pbRule.user_id as string,
            type: pbRule.type as string,
            pattern: pbRule.pattern as string,
            targetCategoryId: pbRule.target_category_id as string,
            confidence: (pbRule.confidence as number) ?? 0.8,
            active: (pbRule.active as boolean) ?? true,
            timesApplied: (pbRule.times_applied as number) ?? 0,
            lastAppliedAt: pbRule.last_applied_at
              ? new Date(pbRule.last_applied_at as string)
              : null,
            createdAt: new Date(pbRule.created_at as string),
            updatedAt: new Date(pbRule.updated_at as string),
          },
        });
        totalImported++;
        process.stdout.write('.');
      } catch (e) {
        errors.push({
          table: 'rules',
          error: `Rule ${pbRule.type}: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }
    console.log(`\n  ✓ Imported ${data.rules.length} rules\n`);

    // 5. Import transactions (batch process for large volumes)
    console.log('💰 Importing transactions...');
    const totalTransactions = data.transactions.length;
    const batchSize = 500;

    for (let i = 0; i < totalTransactions; i += batchSize) {
      const batch = data.transactions.slice(i, i + batchSize);

      try {
        const results = await Promise.allSettled(
          batch.map((pbTx) =>
            prisma.transaction.create({
              data: {
                id: (pbTx.id as string) || undefined,
                userId: pbTx.user_id as string,
                accountId: pbTx.account_id as string,
                date: new Date(pbTx.date as string),
                amount: parseFloat(pbTx.amount as string),
                merchant: (pbTx.merchant as string) || null,
                description: pbTx.description as string,
                categoryId: (pbTx.category_id as string) || null,
                plaidTransactionId: (pbTx.plaid_transaction_id as string) || null,
                status: (pbTx.status as string) || 'pending',
                notes: (pbTx.notes as string) || null,
                aiConfidence: pbTx.ai_confidence as number | null,
                aiCategoryId: (pbTx.ai_category_id as string) || null,
                createdAt: new Date(pbTx.created_at as string),
                updatedAt: new Date(pbTx.updated_at as string),
              },
            })
          )
        );

        const succeeded = results.filter((r) => r.status === 'fulfilled').length;
        totalImported += succeeded;

        results.forEach((result, idx) => {
          if (result.status === 'rejected') {
            const tx = batch[idx];
            errors.push({
              table: 'transactions',
              error: `Transaction ${tx.id}: ${result.reason}`,
            });
          }
        });

        const progress = Math.round(((i + batch.length) / totalTransactions) * 100);
        console.log(`  ✓ Progress: ${i + batch.length}/${totalTransactions} (${progress}%)`);
      } catch (e) {
        console.error(`  ✗ Batch import failed:`, e);
      }
    }
    console.log('');

    // 6. Import statements
    console.log('📊 Importing statements...');
    for (const pbStatement of data.statements) {
      try {
        await prisma.statement.create({
          data: {
            id: (pbStatement.id as string) || undefined,
            userId: pbStatement.user_id as string,
            periodStart: new Date(pbStatement.period_start as string),
            periodEnd: new Date(pbStatement.period_end as string),
            data: (pbStatement.data as Record<string, unknown>) || {},
            createdAt: new Date(pbStatement.created_at as string),
          },
        });
        totalImported++;
        process.stdout.write('.');
      } catch (e) {
        errors.push({
          table: 'statements',
          error: `Statement: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }
    console.log(`\n  ✓ Imported ${data.statements.length} statements\n`);

    // 7. Import audit logs (batch process)
    console.log('📝 Importing audit logs...');
    const totalLogs = data.auditLogs.length;

    for (let i = 0; i < totalLogs; i += batchSize) {
      const batch = data.auditLogs.slice(i, i + batchSize);

      try {
        await Promise.all(
          batch.map((pbLog) =>
            prisma.auditLog.create({
              data: {
                id: (pbLog.id as string) || undefined,
                userId: pbLog.user_id as string,
                collection: pbLog.collection as string,
                action: pbLog.action as string,
                recordId: pbLog.record_id as string,
                changes: (pbLog.changes as Record<string, unknown>) || null,
                createdAt: new Date(pbLog.created_at as string),
              },
            })
          )
        );

        totalImported += batch.length;
        const progress = Math.round(((i + batch.length) / totalLogs) * 100);
        console.log(`  ✓ Progress: ${i + batch.length}/${totalLogs} (${progress}%)`);
      } catch (e) {
        console.error(`  ✗ Audit log batch failed:`, e);
      }
    }
    console.log('');

    // Summary
    console.log('='.repeat(60));
    console.log('✅ Migration completed!');
    console.log(`\nTotal records imported: ${totalImported}`);

    if (errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${errors.length}`);
      errors.slice(0, 10).forEach((err) => {
        console.log(`  - ${err.table}: ${err.error}`);
      });
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more`);
      }
    }

    if (verify) {
      console.log('\n🔍 Running verification...');
      await verifyImport(data);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyImport(originalData: ExportData) {
  const userCount = await prisma.user.count();
  const accountCount = await prisma.account.count();
  const txCount = await prisma.transaction.count();
  const catCount = await prisma.category.count();
  const ruleCount = await prisma.rule.count();
  const stmtCount = await prisma.statement.count();
  const logCount = await prisma.auditLog.count();

  console.log('\nData counts verification:');
  console.log(`  Users: ${userCount} (expected: ${originalData.users.length})`);
  console.log(`  Accounts: ${accountCount} (expected: ${originalData.accounts.length})`);
  console.log(`  Transactions: ${txCount} (expected: ${originalData.transactions.length})`);
  console.log(`  Categories: ${catCount} (expected: ${originalData.categories.length})`);
  console.log(`  Rules: ${ruleCount} (expected: ${originalData.rules.length})`);
  console.log(`  Statements: ${stmtCount} (expected: ${originalData.statements.length})`);
  console.log(`  Audit logs: ${logCount} (expected: ${originalData.auditLogs.length})`);

  const allMatch =
    userCount === originalData.users.length &&
    accountCount === originalData.accounts.length &&
    txCount === originalData.transactions.length &&
    catCount === originalData.categories.length &&
    ruleCount === originalData.rules.length &&
    stmtCount === originalData.statements.length &&
    logCount === originalData.auditLogs.length;

  if (allMatch) {
    console.log('\n✅ Verification passed!');
  } else {
    console.log('\n❌ Verification failed - counts do not match!');
    process.exit(1);
  }
}

// CLI execution
async function main() {
  const exportFile = process.argv[2] || 'pocketbase_export.json';
  const shouldVerify = process.argv.includes('--verify');

  try {
    await importToPgSQL(exportFile, shouldVerify);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export default importToPgSQL;
```

---

## 4. Environment Configuration

### Development Environment

**File**: `backend/.env.local`

```env
# Database
DATABASE_URL="postgresql://budgettool_user:password@localhost:5432/budget_tool_dev"

# API
NEXT_PUBLIC_API_URL="http://localhost:3000"
API_SECRET_KEY="dev-secret-key"

# JWT
JWT_SECRET="dev-jwt-secret"
JWT_EXPIRATION="7d"

# External APIs
ANTHROPIC_API_KEY="sk-ant-xxx"
PLAID_CLIENT_ID="client-id"
PLAID_SECRET="secret"

# Environment
NODE_ENV="development"
DEBUG="true"
LOG_LEVEL="debug"
```

### Production Environment

**File**: Systemd environment file `/etc/default/budget-app`

```env
# Database (Managed PostgreSQL)
DATABASE_URL="postgresql://budgettool_user:SECURE_PASSWORD@db.internal.digitalocean.com:5432/budget_tool"

# API
NEXT_PUBLIC_API_URL="https://api.budgettool.com"
API_SECRET_KEY="production-secret-key-change-this"

# JWT
JWT_SECRET="production-jwt-secret-change-this"
JWT_EXPIRATION="7d"

# External APIs
ANTHROPIC_API_KEY="sk-ant-production"
PLAID_CLIENT_ID="production-client-id"
PLAID_SECRET="production-secret"

# Environment
NODE_ENV="production"
DEBUG="false"
LOG_LEVEL="info"

# Performance
DATABASE_CONNECTION_POOL_SIZE="20"
DATABASE_TIMEOUT="30"
API_TIMEOUT="60"
```

### Docker Environment

**File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: budgettool_user
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: budget_tool_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U budgettool_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: "postgresql://budgettool_user:secure_password@postgres:5432/budget_tool_dev"
      NODE_ENV: "development"
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend:/app
      - /app/node_modules

volumes:
  postgres_data:
```

---

## 5. API Implementation Examples

### Authentication Endpoint

**File**: `backend/app/api/auth/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '7d';

export async function POST(request: NextRequest) {
  const { action, email, password, username } = await request.json();

  switch (action) {
    case 'login':
      return handleLogin(email, password);
    case 'signup':
      return handleSignup(email, password, username);
    case 'verify':
      return handleVerifyToken(request);
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

async function handleLogin(email: string, password: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return NextResponse.json(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

async function handleSignup(
  email: string,
  password: string,
  username: string
) {
  try {
    // Check if user exists
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
      },
    });

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );

    return NextResponse.json(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Signup failed' },
      { status: 500 }
    );
  }
}

async function handleVerifyToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No token provided' }, { status: 401 });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
    };
    return NextResponse.json({ valid: true, userId: decoded.userId });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
```

### Transactions Endpoint

**File**: `backend/app/api/transactions/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const userId = await verifyAuth(request);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const perPage = parseInt(searchParams.get('perPage') || '20');
  const categoryId = searchParams.get('categoryId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    const where: Record<string, unknown> = { userId };

    if (categoryId) where.categoryId = categoryId;
    if (startDate)
      where.date = { gte: new Date(startDate), ...where.date };
    if (endDate)
      where.date = {
        lte: new Date(endDate),
        ...(where.date as Record<string, unknown>),
      };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { category: true },
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { date: 'desc' },
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
      items: transactions,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const userId = await verifyAuth(request);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  try {
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        accountId: body.accountId,
        date: new Date(body.date),
        amount: parseFloat(body.amount),
        merchant: body.merchant,
        description: body.description,
        categoryId: body.categoryId,
        notes: body.notes,
      },
      include: { category: true },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
```

---

## 6. Monitoring & Alerting

### Prometheus Configuration

**File**: `monitoring/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'next-app'
    static_configs:
      - targets: ['localhost:3000/metrics']

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']
```

### Grafana Dashboards

**Key metrics to monitor**:

```json
{
  "dashboard": {
    "title": "Budget Tool Metrics",
    "panels": [
      {
        "title": "API Response Time",
        "targets": [
          {
            "expr": "http_request_duration_seconds_bucket{service='next-app'}"
          }
        ]
      },
      {
        "title": "Database Connections",
        "targets": [
          {
            "expr": "pg_stat_activity_count{service='postgres'}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~'5..'}[5m])"
          }
        ]
      }
    ]
  }
}
```

### Alert Rules

**File**: `monitoring/alerts.yml`

```yaml
groups:
  - name: budget_tool
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~'5..'}[5m]) > 0.01
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: DatabaseDown
        expr: up{job='postgres'} == 0
        for: 1m
        annotations:
          summary: "PostgreSQL database is down"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
        for: 5m
        annotations:
          summary: "P95 response time is high"
```

---

## 7. Backup & Recovery Scripts

### Automated Backup Script

**File**: `scripts/backup-postgres.sh`

```bash
#!/bin/bash

set -e

# Configuration
DB_USER="${DB_USER:-budgettool_user}"
DB_NAME="${DB_NAME:-budget_tool}"
DB_HOST="${DB_HOST:-localhost}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Create backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/postgres_backup_${TIMESTAMP}.sql"

echo "Starting PostgreSQL backup..."
pg_dump -U "${DB_USER}" -h "${DB_HOST}" "${DB_NAME}" > "${BACKUP_FILE}"
gzip "${BACKUP_FILE}"
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "✅ Backup created: ${BACKUP_FILE}"

# Verify backup
if ! gunzip -t "${BACKUP_FILE}" 2>/dev/null; then
  echo "❌ Backup verification failed"
  rm "${BACKUP_FILE}"
  exit 1
fi

echo "✅ Backup verified"

# Upload to S3 (optional)
if command -v aws &> /dev/null; then
  aws s3 cp "${BACKUP_FILE}" "s3://budget-tool-backups/"
  echo "✅ Backup uploaded to S3"
fi

# Cleanup old backups
find "${BACKUP_DIR}" -name "postgres_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "✅ Old backups cleaned up"
```

### Recovery Script

**File**: `scripts/restore-postgres.sh`

```bash
#!/bin/bash

set -e

# Configuration
DB_USER="${DB_USER:-budgettool_user}"
DB_NAME="${DB_NAME:-budget_tool}"
DB_HOST="${DB_HOST:-localhost}"
BACKUP_FILE="${1}"

if [ -z "${BACKUP_FILE}" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "⚠️  WARNING: This will restore database from backup"
echo "⚠️  Current data will be lost!"
read -p "Continue? (yes/no): " confirm

if [ "${confirm}" != "yes" ]; then
  echo "Cancelled"
  exit 0
fi

# Stop application
echo "Stopping application..."
systemctl stop next-app || true

# Restore database
echo "Restoring database from ${BACKUP_FILE}..."

if [[ "${BACKUP_FILE}" == *.gz ]]; then
  gunzip -c "${BACKUP_FILE}" | psql -U "${DB_USER}" -h "${DB_HOST}" "${DB_NAME}"
else
  psql -U "${DB_USER}" -h "${DB_HOST}" "${DB_NAME}" < "${BACKUP_FILE}"
fi

echo "✅ Database restored"

# Restart application
echo "Restarting application..."
systemctl start next-app

echo "✅ Recovery complete"
```

---

**This technical reference provides**:
- Complete Prisma schema with all models and relations
- PostgreSQL migration scripts
- TypeScript data migration scripts
- Environment configuration for all environments
- API implementation examples
- Monitoring setup
- Backup and recovery procedures

For questions or updates, refer to the main `MIGRATION_PLAN.md`.
