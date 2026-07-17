# Backend Integration Layer — Complete Implementation Guide

## Table of Contents

1. [System Architecture](#system-architecture)
2. [API Route Organization](#api-route-organization)
3. [Middleware Stack](#middleware-stack)
4. [Authentication & Authorization](#authentication--authorization)
5. [Transaction Normalization Pipeline](#transaction-normalization-pipeline)
6. [Deduplication Algorithm](#deduplication-algorithm)
7. [Categorization Engine](#categorization-engine)
8. [Budget Calculation Engine](#budget-calculation-engine)
9. [Financial Report Generation](#financial-report-generation)
10. [Plaid API Integration](#plaid-api-integration)
11. [CSV Parsing & Validation](#csv-parsing--validation)
12. [File Export Generation](#file-export-generation)
13. [Error Handling & Logging](#error-handling--logging)
14. [Database Query Optimization](#database-query-optimization)
15. [Implementation Checklist](#implementation-checklist)

---

## System Architecture

### Backend Structure

```
app/api/
├── auth/
│   ├── login/route.ts              # User authentication
│   ├── register/route.ts           # Account creation
│   ├── logout/route.ts             # Session termination
│   ├── refresh/route.ts            # Token refresh
│   └── verify/route.ts             # Email verification
├── transactions/
│   ├── route.ts                    # GET/POST transactions
│   ├── [id]/route.ts               # GET/PUT/DELETE specific transaction
│   ├── import/route.ts             # CSV/Plaid import
│   ├── deduplicate/route.ts        # Deduplication trigger
│   ├── categorize/route.ts         # AI categorization
│   └── export/route.ts             # Transaction export
├── accounts/
│   ├── route.ts                    # GET/POST accounts
│   ├── [id]/route.ts               # Account management
│   ├── plaid/link/route.ts         # Plaid Link token generation
│   ├── plaid/exchange/route.ts     # Exchange public token
│   └── plaid/webhook/route.ts      # Plaid webhook handler
├── categories/
│   ├── route.ts                    # GET/POST categories
│   ├── [id]/route.ts               # Category management
│   └── rules/route.ts              # Categorization rules
├── budgets/
│   ├── route.ts                    # GET/POST budgets
│   ├── [id]/route.ts               # Budget management
│   └── progress/route.ts           # Budget tracking
├── reports/
│   ├── income-statement/route.ts   # Income statement
│   ├── cash-flow/route.ts          # Cash flow report
│   ├── budget-vs-actual/route.ts   # Budget comparison
│   └── export/route.ts             # Report export (PDF/Excel)
└── health/route.ts                 # Health check endpoint

lib/
├── middleware/
│   ├── auth.ts                     # Authentication wrapper
│   ├── errorHandler.ts             # Global error handling
│   ├── rateLimiter.ts              # Rate limiting
│   ├── validator.ts                # Input validation
│   └── cors.ts                     # CORS configuration
├── services/
│   ├── transactionService.ts       # Transaction operations
│   ├── plaidService.ts             # Plaid API wrapper
│   ├── categorizationService.ts    # AI categorization
│   ├── deduplicationService.ts     # Duplicate detection
│   ├── budgetService.ts            # Budget calculations
│   ├── reportService.ts            # Report generation
│   └── csvService.ts               # CSV parsing/generation
├── database/
│   ├── client.ts                   # Prisma client singleton
│   ├── queryBuilder.ts             # Query optimization helper
│   ├── seed.ts                     # Database seeding
│   └── migrations/                 # Prisma migrations
├── utils/
│   ├── encryption.ts               # AES-256 encryption/decryption
│   ├── logger.ts                   # Logging utility
│   ├── errors.ts                   # Custom error classes
│   ├── validators.ts               # Validation schemas (Zod)
│   ├── formatters.ts               # Data formatting
│   └── constants.ts                # Application constants
├── cache/
│   ├── redis.ts                    # Redis client
│   └── strategies.ts               # Cache strategies
└── external/
    ├── anthropic.ts                # Claude API wrapper
    ├── plaid.ts                    # Plaid API wrapper
    └── aws-s3.ts                   # S3 file storage
```

---

## API Route Organization

### 1. Transactions API

#### GET `/api/transactions`

Fetch paginated transactions with filtering.

```typescript
// lib/services/transactionService.ts

export interface TransactionQuery {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  accountId?: string;
  type?: 'income' | 'expense' | 'transfer';
  search?: string;
  sortBy?: 'date' | 'amount' | 'created';
  sortOrder?: 'asc' | 'desc';
}

export async function getTransactions(
  userId: string,
  query: TransactionQuery,
  options?: { cache?: boolean }
) {
  const {
    page = 1,
    limit = 50,
    startDate,
    endDate,
    categoryId,
    accountId,
    type,
    search,
    sortBy = 'date',
    sortOrder = 'desc'
  } = query;

  const skip = (page - 1) * limit;

  // Build where clause
  const where = {
    userId,
    ...(startDate && { transactionDate: { gte: new Date(startDate) } }),
    ...(endDate && { transactionDate: { lte: new Date(endDate) } }),
    ...(categoryId && { categoryId }),
    ...(accountId && { accountId }),
    ...(type && { type }),
    ...(search && {
      OR: [
        { description: { contains: search, mode: 'insensitive' } },
        { merchant: { contains: search, mode: 'insensitive' } }
      ]
    })
  };

  // Build orderBy
  const orderBy = {
    [sortBy]: sortOrder
  };

  try {
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: true,
          subcategory: true,
          account: true
        }
      }),
      prisma.transaction.count({ where })
    ]);

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('getTransactions failed', { userId, query, error });
    throw new DatabaseError('Failed to fetch transactions');
  }
}
```

#### POST `/api/transactions`

Create single transaction.

```typescript
export interface CreateTransactionInput {
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  transactionDate: string;
  accountId: string;
  categoryId?: string;
  subcategoryId?: string;
  merchant?: string;
  notes?: string;
  tags?: string[];
  isSplit?: boolean;
  splitTransactions?: CreateTransactionInput[];
}

export async function createTransaction(
  userId: string,
  input: CreateTransactionInput
) {
  // Validate
  const validated = transactionSchema.parse(input);

  try {
    const transaction = await prisma.transaction.create({
      data: {
        ...validated,
        userId,
        accountId: validated.accountId,
        source: 'manual',
        transactionDate: new Date(validated.transactionDate),
        auditLog: {
          create: {
            userId,
            action: 'created',
            entityType: 'transaction',
            entityId: undefined, // Will be set by DB
            changes: { created: validated }
          }
        }
      },
      include: {
        category: true,
        account: true
      }
    });

    // Invalidate cache
    await cacheInvalidate(`transactions:${userId}`);

    return transaction;
  } catch (error) {
    logger.error('createTransaction failed', { userId, input, error });
    throw new ValidationError('Failed to create transaction');
  }
}
```

#### PUT `/api/transactions/[id]`

Update transaction with audit trail.

```typescript
export async function updateTransaction(
  userId: string,
  transactionId: string,
  updates: Partial<CreateTransactionInput>
) {
  // Fetch original
  const original = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { category: true }
  });

  if (!original || original.userId !== userId) {
    throw new NotFoundError('Transaction not found');
  }

  try {
    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        ...updates,
        updatedAt: new Date(),
        auditLog: {
          create: {
            userId,
            action: 'updated',
            entityType: 'transaction',
            entityId: transactionId,
            changes: {
              before: original,
              after: updates
            }
          }
        }
      },
      include: { category: true }
    });

    await cacheInvalidate(`transactions:${userId}`);
    return updated;
  } catch (error) {
    logger.error('updateTransaction failed', { userId, transactionId, error });
    throw new DatabaseError('Failed to update transaction');
  }
}
```

---

## Middleware Stack

### 1. Authentication Middleware

```typescript
// lib/middleware/auth.ts

import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret'
);

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  iat: number;
  exp: number;
}

export async function authenticateRequest(
  request: Request
): Promise<AuthPayload> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      throw new UnauthorizedError('No authentication token');
    }

    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as AuthPayload;
  } catch (error) {
    logger.warn('Authentication failed', { error });
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export function withAuth<T extends any[], R>(
  handler: (auth: AuthPayload, ...args: T) => Promise<R>
) {
  return async (request: Request, ...args: T) => {
    const auth = await authenticateRequest(request);
    return handler(auth, ...args);
  };
}
```

### 2. Error Handler Middleware

```typescript
// lib/middleware/errorHandler.ts

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(400, message, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message, 'NOT_FOUND');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(500, message, 'DATABASE_ERROR');
  }
}

export function handleError(error: unknown): Response {
  if (error instanceof AppError) {
    logger.error(error.message, {
      statusCode: error.statusCode,
      code: error.code,
      details: error.details
    });

    return Response.json(
      {
        error: error.message,
        code: error.code,
        details: error.details
      },
      { status: error.statusCode }
    );
  }

  // Prisma errors
  if (error instanceof PrismaClientKnownRequestError) {
    logger.error('Prisma error', { code: error.code, message: error.message });

    if (error.code === 'P2025') {
      return Response.json(
        { error: 'Record not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return Response.json(
      { error: 'Database error', code: 'DATABASE_ERROR' },
      { status: 500 }
    );
  }

  // Unknown error
  logger.error('Unhandled error', { error });
  return Response.json(
    { error: 'Internal server error', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}
```

### 3. Input Validation Middleware

```typescript
// lib/utils/validators.ts

import { z } from 'zod';

export const transactionSchema = z.object({
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  type: z.enum(['income', 'expense', 'transfer']),
  transactionDate: z.string().datetime(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  subcategoryId: z.string().uuid().optional(),
  merchant: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  isSplit: z.boolean().optional()
});

export const budgetSchema = z.object({
  name: z.string().min(1).max(255),
  categoryId: z.string().uuid(),
  budgetAmount: z.number().positive(),
  year: z.number().min(2000).max(2100),
  month: z.number().min(1).max(12).optional(),
  alertThreshold: z.number().min(0).max(1).default(0.8)
});

export const csvImportSchema = z.object({
  accountId: z.string().uuid(),
  skipHeader: z.boolean().default(true),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).default('MM/DD/YYYY'),
  mapping: z.record(z.string()).optional()
});

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formatted = Object.entries(
        error.flatten().fieldErrors
      ).reduce((acc, [key, msgs]) => {
        acc[key] = msgs?.[0] || 'Invalid value';
        return acc;
      }, {} as Record<string, string>);

      throw new ValidationError('Validation failed', formatted);
    }
    throw error;
  }
}
```

### 4. Rate Limiter Middleware

```typescript
// lib/middleware/rateLimiter.ts

interface RateLimitConfig {
  windowMs: number;      // Time window in ms
  maxRequests: number;   // Max requests per window
  keyGenerator?: (req: Request) => string;
}

export class RateLimiter {
  private store: Map<string, { count: number; resetAt: number }> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async check(request: Request): Promise<boolean> {
    const key = this.config.keyGenerator?.(request) || request.ip || 'unknown';
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + this.config.windowMs });
      return true;
    }

    if (record.count >= this.config.maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }
}

export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  keyGenerator: (req) => req.headers.get('x-forwarded-for') || 'unknown'
});

export async function checkRateLimit(request: Request) {
  const allowed = await apiRateLimiter.check(request);
  if (!allowed) {
    throw new AppError(429, 'Rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
  }
}
```

---

## Authentication & Authorization

### 1. JWT Token Generation

```typescript
// lib/services/authService.ts

import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcrypt';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret'
);

export async function generateTokens(
  userId: string,
  email: string,
  role: 'user' | 'admin' = 'user'
) {
  const now = new Date();
  const accessTokenExpiry = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins
  const refreshTokenExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const accessToken = await new SignJWT({
    userId,
    email,
    role
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(accessTokenExpiry.getTime() / 1000))
    .sign(JWT_SECRET);

  const refreshToken = await new SignJWT({
    userId,
    type: 'refresh'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(refreshTokenExpiry.getTime() / 1000))
    .sign(JWT_SECRET);

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60 // 15 minutes in seconds
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function login(
  email: string,
  password: string
): Promise<{ user: UserProfile; tokens: TokenPair }> {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  if (!user.emailVerified) {
    throw new ValidationError('Please verify your email address');
  }

  const tokens = await generateTokens(user.id, user.email, user.role);

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role
    },
    tokens
  };
}
```

### 2. Authorization Guard

```typescript
// lib/middleware/authorize.ts

export type Permission =
  | 'transactions:read'
  | 'transactions:write'
  | 'categories:read'
  | 'categories:write'
  | 'budgets:read'
  | 'budgets:write'
  | 'reports:read'
  | 'reports:write'
  | 'admin:*';

const rolePermissions: Record<string, Permission[]> = {
  user: [
    'transactions:read',
    'transactions:write',
    'categories:read',
    'categories:write',
    'budgets:read',
    'budgets:write',
    'reports:read'
  ],
  admin: ['admin:*']
};

export function authorize(...permissions: Permission[]) {
  return (auth: AuthPayload) => {
    const userPermissions = rolePermissions[auth.role] || [];
    const hasAdmin = userPermissions.includes('admin:*');

    if (hasAdmin) return true;

    return permissions.some((p) => userPermissions.includes(p));
  };
}

export function withAuthorization(
  permissionCheck: (auth: AuthPayload) => boolean
) {
  return (handler: (auth: AuthPayload, req: Request) => Promise<Response>) => {
    return async (auth: AuthPayload, request: Request): Promise<Response> => {
      if (!permissionCheck(auth)) {
        return Response.json(
          { error: 'Access denied', code: 'FORBIDDEN' },
          { status: 403 }
        );
      }
      return handler(auth, request);
    };
  };
}
```

---

## Transaction Normalization Pipeline

### 1. Normalization Service

```typescript
// lib/services/normalizationService.ts

export interface RawTransaction {
  date: string;
  description: string;
  merchant?: string;
  amount: string | number;
  balance?: string | number;
  type?: string;
  reference?: string;
  [key: string]: any;
}

export interface NormalizedTransaction {
  description: string;
  merchant: string | null;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  transactionDate: Date;
  sourceId: string;
}

export class TransactionNormalizer {
  /**
   * Normalize raw transaction from any source to standard format
   */
  normalize(
    raw: RawTransaction,
    mapping?: Record<string, string>
  ): NormalizedTransaction {
    const {
      date,
      description,
      merchant,
      amount,
      type: rawType,
      reference
    } = raw;

    // Parse amount
    const parsedAmount = this.parseAmount(amount);
    if (parsedAmount === null) {
      throw new ValidationError('Invalid amount format', { amount });
    }

    // Determine transaction type
    const normalizedType = this.determineType(parsedAmount, rawType);

    // Parse date
    const transactionDate = this.parseDate(date);
    if (!transactionDate) {
      throw new ValidationError('Invalid date format', { date });
    }

    // Generate deterministic source ID for deduplication
    const sourceId = this.generateSourceId({
      amount: Math.abs(parsedAmount),
      date: transactionDate.toISOString().split('T')[0],
      description: description.trim()
    });

    return {
      description: description.trim(),
      merchant: merchant?.trim() || null,
      amount: parsedAmount,
      type: normalizedType,
      transactionDate,
      sourceId
    };
  }

  private parseAmount(value: string | number): number | null {
    if (typeof value === 'number') return value;

    // Remove currency symbols and whitespace
    const cleaned = String(value)
      .replace(/[$€£¥]/g, '')
      .replace(/\s/g, '')
      .trim();

    if (!cleaned || isNaN(Number(cleaned))) {
      return null;
    }

    return parseFloat(cleaned);
  }

  private determineType(
    amount: number,
    rawType?: string
  ): 'income' | 'expense' | 'transfer' {
    if (rawType) {
      const lower = rawType.toLowerCase();
      if (lower.includes('transfer')) return 'transfer';
      if (lower.includes('income') || lower.includes('deposit'))
        return 'income';
      if (lower.includes('expense') || lower.includes('charge'))
        return 'expense';
    }

    return amount < 0 ? 'expense' : 'income';
  }

  private parseDate(value: string): Date | null {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
      return null;
    } catch {
      return null;
    }
  }

  private generateSourceId(data: {
    amount: number;
    date: string;
    description: string;
  }): string {
    const input = `${data.amount}|${data.date}|${data.description}`;
    return crypto
      .createHash('sha256')
      .update(input)
      .digest('hex')
      .substring(0, 20);
  }
}

export const normalizer = new TransactionNormalizer();
```

---

## Deduplication Algorithm

### 1. Duplicate Detection

```typescript
// lib/services/deduplicationService.ts

export interface DuplicateGroup {
  primary: Transaction;
  duplicates: Transaction[];
  confidence: number;
}

export class DeduplicationService {
  /**
   * Fuzzy matching for duplicate detection
   */
  findDuplicates(
    transaction: Transaction,
    candidates: Transaction[],
    threshold: number = 0.85
  ): Transaction[] {
    return candidates.filter((candidate) => {
      if (candidate.id === transaction.id) return false;

      const score = this.calculateSimilarity(transaction, candidate);
      return score >= threshold;
    });
  }

  /**
   * Calculate similarity score between two transactions
   * Returns 0-1 where 1 is identical
   */
  private calculateSimilarity(a: Transaction, b: Transaction): number {
    const scores: number[] = [];

    // Amount must match exactly (within 0.01 tolerance for rounding)
    const amountMatch = Math.abs(a.amount - b.amount) < 0.01;
    if (!amountMatch) return 0;
    scores.push(1);

    // Date must be within 3 days
    const dayDiff = Math.abs(
      a.transactionDate.getTime() - b.transactionDate.getTime()
    ) / (1000 * 60 * 60 * 24);

    if (dayDiff > 3) return 0;

    const dateScore = 1 - dayDiff / 3;
    scores.push(dateScore * 0.3);

    // Description similarity (case-insensitive, fuzzy match)
    const descSim = this.stringSimilarity(
      a.description.toLowerCase(),
      b.description.toLowerCase()
    );
    scores.push(descSim * 0.5);

    // Merchant similarity if available
    if (a.merchant && b.merchant) {
      const merchantSim = this.stringSimilarity(
        a.merchant.toLowerCase(),
        b.merchant.toLowerCase()
      );
      scores.push(merchantSim * 0.2);
    }

    return scores.reduce((sum, s) => sum + s, 0) / scores.length;
  }

  /**
   * Levenshtein distance for string similarity
   */
  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const track = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i += 1) {
      track[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j += 1) {
      track[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator
        );
      }
    }

    return track[str2.length][str1.length];
  }

  /**
   * Batch deduplication for imported transactions
   */
  async deduplicateBatch(
    userId: string,
    newTransactions: Transaction[]
  ): Promise<{
    inserted: Transaction[];
    duplicates: DuplicateGroup[];
    skipped: Transaction[];
  }> {
    // Get recent transactions for comparison (last 90 days)
    const existingTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        transactionDate: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        },
        isDuplicate: false
      }
    });

    const inserted: Transaction[] = [];
    const duplicates: DuplicateGroup[] = [];
    const skipped: Transaction[] = [];

    for (const transaction of newTransactions) {
      const matches = this.findDuplicates(transaction, existingTransactions);

      if (matches.length === 0) {
        inserted.push(transaction);
        existingTransactions.push(transaction);
      } else {
        const primary = matches[0];
        duplicates.push({
          primary,
          duplicates: [transaction],
          confidence: this.calculateSimilarity(transaction, primary)
        });
        skipped.push(transaction);
      }
    }

    return { inserted, duplicates, skipped };
  }
}

export const deduplicationService = new DeduplicationService();
```

---

## Categorization Engine

### 1. Rule-Based Categorization

```typescript
// lib/services/categorizationService.ts

export interface CategorizationRule {
  id: string;
  pattern: string;
  matchType: 'contains' | 'equals' | 'regex' | 'startsWith' | 'endsWith';
  searchField: 'description' | 'merchant' | 'amount';
  categoryId: string;
  subcategoryId?: string;
  priority: number;
  autoApply: boolean;
}

export class RuleBasedCategorizer {
  /**
   * Apply categorization rules to transaction
   */
  async categorizeByRules(
    userId: string,
    transaction: Transaction,
    rules?: CategorizationRule[]
  ): Promise<{ categoryId: string; subcategoryId?: string } | null> {
    // Fetch rules if not provided
    if (!rules) {
      rules = await prisma.rule.findMany({
        where: { userId, isActive: true },
        orderBy: { priority: 'desc' }
      });
    }

    // Apply rules in priority order
    for (const rule of rules) {
      if (this.matchesRule(transaction, rule)) {
        return {
          categoryId: rule.categoryId,
          subcategoryId: rule.subcategoryId || undefined
        };
      }
    }

    return null;
  }

  private matchesRule(transaction: Transaction, rule: CategorizationRule): boolean {
    const fieldValue = this.extractFieldValue(transaction, rule.searchField);

    if (!fieldValue) return false;

    switch (rule.matchType) {
      case 'contains':
        return fieldValue.toLowerCase().includes(rule.pattern.toLowerCase());

      case 'equals':
        return fieldValue.toLowerCase() === rule.pattern.toLowerCase();

      case 'startsWith':
        return fieldValue.toLowerCase().startsWith(rule.pattern.toLowerCase());

      case 'endsWith':
        return fieldValue.toLowerCase().endsWith(rule.pattern.toLowerCase());

      case 'regex':
        try {
          return new RegExp(rule.pattern, 'i').test(fieldValue);
        } catch {
          return false;
        }

      default:
        return false;
    }
  }

  private extractFieldValue(
    transaction: Transaction,
    field: string
  ): string | null {
    switch (field) {
      case 'description':
        return transaction.description;
      case 'merchant':
        return transaction.merchant || '';
      case 'amount':
        return Math.abs(transaction.amount).toString();
      default:
        return null;
    }
  }
}

export const ruleCategorizer = new RuleBasedCategorizer();
```

### 2. AI-Powered Categorization

```typescript
// lib/services/aiCategorizationService.ts

import Anthropic from '@anthropic-ai/sdk';

interface CategorizationSuggestion {
  categoryId: string;
  confidence: number;
  reasoning: string;
}

export class AICategorizationService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
  }

  /**
   * Use Claude to categorize transactions with learning
   */
  async categorizeWithAI(
    userId: string,
    transaction: Transaction,
    categories: Category[],
    recentTransactions?: Transaction[]
  ): Promise<CategorizationSuggestion> {
    // Build category list for context
    const categoryList = categories
      .map((c) => `${c.id}: ${c.name} (${c.description || ''})`)
      .join('\n');

    // Get user's recent categorization patterns
    const patterns = recentTransactions
      ?.slice(0, 10)
      .map((t) => `${t.description} -> ${t.category?.name}`)
      .join('\n');

    const prompt = `You are a financial transaction categorizer. Based on the following transaction and categories, suggest the best category.

Transaction Details:
- Description: ${transaction.description}
- Amount: $${Math.abs(transaction.amount)}
- Type: ${transaction.type}
- Merchant: ${transaction.merchant || 'N/A'}

Available Categories:
${categoryList}

Recent User Patterns:
${patterns || 'None'}

Respond in JSON format:
{
  "categoryId": "uuid",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const parsed = JSON.parse(content.text);
      return {
        categoryId: parsed.categoryId,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning
      };
    } catch (error) {
      logger.error('AI categorization failed', { userId, transaction, error });
      throw new Error('AI categorization service unavailable');
    }
  }

  /**
   * Batch categorize multiple transactions
   */
  async categorizeBatch(
    userId: string,
    transactions: Transaction[],
    categories: Category[]
  ): Promise<CategorizationSuggestion[]> {
    const suggestions: CategorizationSuggestion[] = [];

    // Process in batches to avoid rate limits
    const batchSize = 5;

    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map((t) =>
          this.categorizeWithAI(userId, t, categories, transactions.slice(0, 10))
        )
      );

      suggestions.push(...results);

      // Add delay between batches
      if (i + batchSize < transactions.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return suggestions;
  }
}

export const aiCategorizer = new AICategorizationService();
```

---

## Budget Calculation Engine

### 1. Budget Tracking

```typescript
// lib/services/budgetService.ts

export interface BudgetProgress {
  budgetId: string;
  categoryId: string;
  budgetAmount: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  isOverBudget: boolean;
  transactions: Transaction[];
}

export class BudgetCalculator {
  /**
   * Calculate budget progress for a given period
   */
  async calculateBudgetProgress(
    userId: string,
    year: number,
    month?: number
  ): Promise<BudgetProgress[]> {
    // Get all budgets for period
    const budgets = await prisma.budget.findMany({
      where: {
        userId,
        year,
        ...(month && { month }),
        isActive: true
      }
    });

    // Calculate progress for each budget
    const progressList = await Promise.all(
      budgets.map((budget) => this.calculateSingleBudget(budget))
    );

    return progressList;
  }

  private async calculateSingleBudget(budget: Budget): Promise<BudgetProgress> {
    const startDate = new Date(budget.year, budget.month ? budget.month - 1 : 0, 1);
    const endDate = budget.month
      ? new Date(budget.year, budget.month, 0)
      : new Date(budget.year, 11, 31);

    const transactions = await prisma.transaction.findMany({
      where: {
        categoryId: budget.categoryId,
        transactionDate: {
          gte: startDate,
          lte: endDate
        },
        type: 'expense'
      }
    });

    const spent = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const remaining = budget.budgetAmount - spent;
    const percentUsed = (spent / budget.budgetAmount) * 100;

    return {
      budgetId: budget.id,
      categoryId: budget.categoryId,
      budgetAmount: budget.budgetAmount,
      spent,
      remaining,
      percentUsed,
      isOverBudget: spent > budget.budgetAmount,
      transactions
    };
  }

  /**
   * Check budget alerts
   */
  async checkBudgetAlerts(
    userId: string,
    year: number,
    month?: number
  ): Promise<{ budgetId: string; percentUsed: number }[]> {
    const progress = await this.calculateBudgetProgress(userId, year, month);

    return progress
      .filter((p) => p.percentUsed >= 80) // Alert at 80%
      .map((p) => ({
        budgetId: p.budgetId,
        percentUsed: p.percentUsed
      }));
  }

  /**
   * Forecast budget status for rest of period
   */
  async forecastBudget(
    userId: string,
    budgetId: string
  ): Promise<{
    projectedSpending: number;
    daysRemaining: number;
    dailyPace: number;
    projectedOverspend: number | null;
  }> {
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId }
    });

    if (!budget) {
      throw new NotFoundError('Budget not found');
    }

    const now = new Date();
    const currentDay = now.getDate();
    const daysInMonth = new Date(
      budget.year,
      budget.month || 12,
      0
    ).getDate();
    const daysRemaining = daysInMonth - currentDay;

    // Get spending so far this month
    const startDate = new Date(budget.year, budget.month ? budget.month - 1 : 0, 1);
    const transactions = await prisma.transaction.findMany({
      where: {
        categoryId: budget.categoryId,
        transactionDate: {
          gte: startDate,
          lt: now
        },
        type: 'expense'
      }
    });

    const spent = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const dailyPace = spent / currentDay;
    const projectedSpending = dailyPace * daysInMonth;
    const projectedOverspend =
      projectedSpending > budget.budgetAmount
        ? projectedSpending - budget.budgetAmount
        : null;

    return {
      projectedSpending,
      daysRemaining,
      dailyPace,
      projectedOverspend
    };
  }
}

export const budgetCalculator = new BudgetCalculator();
```

---

## Financial Report Generation

### 1. Income Statement Report

```typescript
// lib/services/reportService.ts

export interface IncomeStatement {
  period: string;
  income: {
    total: number;
    byCategory: Record<string, number>;
  };
  expenses: {
    total: number;
    byCategory: Record<string, number>;
  };
  netIncome: number;
  transactions: Transaction[];
}

export class ReportGenerator {
  /**
   * Generate income statement for period
   */
  async generateIncomeStatement(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IncomeStatement> {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        transactionDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        category: true
      }
    });

    const income: Record<string, number> = {};
    const expenses: Record<string, number> = {};
    let incomeTotal = 0;
    let expenseTotal = 0;

    for (const transaction of transactions) {
      const categoryName = transaction.category?.name || 'Uncategorized';
      const amount = Math.abs(transaction.amount);

      if (transaction.type === 'income') {
        incomeTotal += amount;
        income[categoryName] = (income[categoryName] || 0) + amount;
      } else if (transaction.type === 'expense') {
        expenseTotal += amount;
        expenses[categoryName] = (expenses[categoryName] || 0) + amount;
      }
    }

    const period = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;

    return {
      period,
      income: { total: incomeTotal, byCategory: income },
      expenses: { total: expenseTotal, byCategory: expenses },
      netIncome: incomeTotal - expenseTotal,
      transactions
    };
  }

  /**
   * Generate cash flow statement
   */
  async generateCashFlow(
    userId: string,
    startDate: Date,
    endDate: Date,
    interval: 'daily' | 'weekly' | 'monthly' = 'monthly'
  ): Promise<{
    period: string;
    intervals: Array<{
      date: string;
      inflow: number;
      outflow: number;
      netCashFlow: number;
      cumulativeFlow: number;
    }>;
  }> {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        transactionDate: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const intervals: Array<{
      date: string;
      inflow: number;
      outflow: number;
      netCashFlow: number;
      cumulativeFlow: number;
    }> = [];

    let cumulativeFlow = 0;

    // Group transactions by interval
    const grouped = this.groupByInterval(transactions, interval);

    for (const [dateKey, txns] of Object.entries(grouped)) {
      const inflow = txns
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const outflow = txns
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const netCashFlow = inflow - outflow;
      cumulativeFlow += netCashFlow;

      intervals.push({
        date: dateKey,
        inflow,
        outflow,
        netCashFlow,
        cumulativeFlow
      });
    }

    return {
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      intervals
    };
  }

  private groupByInterval(
    transactions: Transaction[],
    interval: string
  ): Record<string, Transaction[]> {
    const grouped: Record<string, Transaction[]> = {};

    for (const transaction of transactions) {
      let key: string;

      if (interval === 'daily') {
        key = transaction.transactionDate.toISOString().split('T')[0];
      } else if (interval === 'weekly') {
        const d = new Date(transaction.transactionDate);
        const week = Math.floor(
          (d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay() - 1) /
            7
        );
        key = `${d.getFullYear()}-W${week}`;
      } else {
        // monthly
        key = transaction.transactionDate.toISOString().slice(0, 7);
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(transaction);
    }

    return grouped;
  }
}

export const reportGenerator = new ReportGenerator();
```

---

## Plaid API Integration

### 1. Plaid Service

```typescript
// lib/external/plaid.ts

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const configuration = new Configuration({
  basePath: PlaidEnvironments[
    (process.env.PLAID_ENV || 'sandbox') as keyof typeof PlaidEnvironments
  ],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET
    }
  }
});

export const plaidClient = new PlaidApi(configuration);

export class PlaidService {
  /**
   * Create Link token for user to connect account
   */
  async createLinkToken(userId: string, email: string): Promise<string> {
    try {
      const response = await plaidClient.linkTokenCreate({
        user: { client_user_id: userId },
        client_name: 'Budget Tool',
        language: 'en',
        country_codes: ['US'],
        products: ['auth', 'transactions'],
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/plaid/callback`
      });

      return response.data.link_token;
    } catch (error) {
      logger.error('Failed to create Plaid link token', { userId, error });
      throw new Error('Plaid integration unavailable');
    }
  }

  /**
   * Exchange public token for access token
   */
  async exchangePublicToken(
    publicToken: string,
    userId: string
  ): Promise<{
    accessToken: string;
    itemId: string;
    accounts: Array<{ id: string; name: string; subtype: string }>;
  }> {
    try {
      const response = await plaidClient.itemPublicTokenExchange({
        public_token: publicToken
      });

      // Fetch accounts associated with this item
      const accountsResponse = await plaidClient.accountsGet({
        access_token: response.data.access_token
      });

      return {
        accessToken: response.data.access_token,
        itemId: response.data.item_id,
        accounts: accountsResponse.data.accounts.map((account) => ({
          id: account.account_id,
          name: account.name,
          subtype: account.subtype || account.type
        }))
      };
    } catch (error) {
      logger.error('Failed to exchange Plaid token', { error });
      throw new Error('Token exchange failed');
    }
  }

  /**
   * Fetch transactions from Plaid
   */
  async fetchTransactions(
    accessToken: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    id: string;
    date: string;
    name: string;
    amount: number;
    merchant_name?: string;
  }>> {
    try {
      const response = await plaidClient.transactionsGet({
        access_token: accessToken,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        options: {
          count: 250,
          offset: 0
        }
      });

      return response.data.transactions.map((t) => ({
        id: t.transaction_id,
        date: t.date,
        name: t.name,
        amount: t.amount,
        merchant_name: t.merchant_name
      }));
    } catch (error) {
      logger.error('Failed to fetch Plaid transactions', { error });
      throw new Error('Transaction fetch failed');
    }
  }

  /**
   * Sync transactions using cursor (incremental sync)
   */
  async syncTransactions(
    accessToken: string,
    cursor?: string
  ): Promise<{
    added: Array<any>;
    modified: Array<any>;
    removed: Array<any>;
    nextCursor: string;
    hasMore: boolean;
  }> {
    try {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor
      });

      return {
        added: response.data.added,
        modified: response.data.modified,
        removed: response.data.removed,
        nextCursor: response.data.next_cursor,
        hasMore: response.data.has_more
      };
    } catch (error) {
      logger.error('Failed to sync Plaid transactions', { error });
      throw new Error('Transaction sync failed');
    }
  }
}

export const plaidService = new PlaidService();
```

### 2. Webhook Handler

```typescript
// app/api/accounts/plaid/webhook/route.ts

import { plaidService } from '@/lib/external/plaid';
import { prisma } from '@/lib/database/client';
import { handleError } from '@/lib/middleware/errorHandler';
import { normalizer } from '@/lib/services/normalizationService';
import { deduplicationService } from '@/lib/services/deduplicationService';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      webhook_type,
      webhook_code,
      item_id,
      error,
      new_transactions,
      new_removed_transactions
    } = body;

    // Find account by item ID
    const account = await prisma.account.findUnique({
      where: { plaidItemId: item_id }
    });

    if (!account) {
      return Response.json({ ok: true }, { status: 200 });
    }

    // Handle different webhook types
    switch (webhook_code) {
      case 'TRANSACTIONS_UPDATES':
        await handleTransactionUpdates(account.id, account.userId);
        break;

      case 'ITEM_ERROR':
        logger.warn('Plaid item error', { itemId: item_id, error });
        await prisma.account.update({
          where: { id: account.id },
          data: { lastSyncError: error.message }
        });
        break;

      case 'SYNC_UPDATES_AVAILABLE':
        await handleTransactionUpdates(account.id, account.userId);
        break;
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    logger.error('Plaid webhook error', { error });
    return Response.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleTransactionUpdates(
  accountId: string,
  userId: string
): Promise<void> {
  const account = await prisma.account.findUnique({
    where: { id: accountId }
  });

  if (!account?.plaidAccessToken) {
    throw new Error('Account not connected to Plaid');
  }

  try {
    // Fetch new transactions since last sync
    const { added, modified, nextCursor } = await plaidService.syncTransactions(
      account.plaidAccessToken,
      account.plaidSyncCursor || undefined
    );

    // Process new transactions
    for (const plaidTx of added) {
      const normalized = normalizer.normalize({
        date: plaidTx.date,
        description: plaidTx.name,
        merchant: plaidTx.merchant_name,
        amount: plaidTx.amount,
        type: plaidTx.amount < 0 ? 'expense' : 'income'
      });

      // Check for duplicates
      const existingTx = await prisma.transaction.findUnique({
        where: {
          plaidTransactionId: plaidTx.transaction_id
        }
      });

      if (!existingTx) {
        await prisma.transaction.create({
          data: {
            userId,
            accountId,
            ...normalized,
            plaidTransactionId: plaidTx.transaction_id,
            plaidMerchantName: plaidTx.merchant_name
          }
        });
      }
    }

    // Update account sync cursor
    await prisma.account.update({
      where: { id: accountId },
      data: {
        plaidSyncCursor: nextCursor,
        lastSyncAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Failed to process Plaid webhook', { accountId, error });
  }
}
```

---

## CSV Parsing & Validation

### 1. CSV Parser

```typescript
// lib/services/csvService.ts

export interface CSVParseOptions {
  skipHeader?: boolean;
  delimiter?: string;
  dateFormat?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  mapping?: Record<string, string>;
}

export class CSVParser {
  /**
   * Parse CSV content into transactions
   */
  async parseCSV(
    content: string,
    options: CSVParseOptions = {}
  ): Promise<Array<Record<string, string>>> {
    const {
      skipHeader = true,
      delimiter = ',',
      dateFormat = 'MM/DD/YYYY'
    } = options;

    const lines = content.trim().split('\n');
    const records: Array<Record<string, string>> = [];

    // Determine headers
    let startIdx = 0;
    let headers: string[] = [];

    if (skipHeader && lines.length > 0) {
      headers = this.parseCSVLine(lines[0], delimiter);
      startIdx = 1;
    }

    // Parse records
    for (let i = startIdx; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i], delimiter);

      if (values.length === 0) continue;

      const record: Record<string, string> = {};

      // Map values to headers (or by index)
      headers.forEach((header, idx) => {
        record[header] = values[idx] || '';
      });

      records.push(record);
    }

    return records;
  }

  /**
   * Validate CSV structure
   */
  validateStructure(
    records: Array<Record<string, string>>,
    requiredFields: string[]
  ): {
    valid: boolean;
    errors: Array<{ row: number; field: string; message: string }>;
  } {
    const errors: Array<{ row: number; field: string; message: string }> = [];

    records.forEach((record, idx) => {
      requiredFields.forEach((field) => {
        if (!record[field] || record[field].trim() === '') {
          errors.push({
            row: idx + 1,
            field,
            message: `Missing required field: ${field}`
          });
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === delimiter && !insideQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }
}

export const csvParser = new CSVParser();
```

---

## File Export Generation

### 1. PDF Report Generation

```typescript
// lib/services/exportService.ts

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import ExcelJS from 'exceljs';

export class ExportService {
  /**
   * Export transactions to CSV
   */
  async exportToCSV(
    transactions: Transaction[]
  ): Promise<string> {
    const headers = [
      'Date',
      'Description',
      'Merchant',
      'Category',
      'Amount',
      'Type',
      'Account'
    ];

    const rows = transactions.map((t) => [
      t.transactionDate.toISOString().split('T')[0],
      t.description,
      t.merchant || '',
      t.category?.name || '',
      t.amount.toFixed(2),
      t.type,
      t.account?.name || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((v) => `"${v}"`).join(','))
    ].join('\n');

    return csv;
  }

  /**
   * Export transactions to Excel
   */
  async exportToExcel(
    transactions: Transaction[],
    fileName: string = 'transactions.xlsx'
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');

    // Add headers
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Description', key: 'description', width: 25 },
      { header: 'Merchant', key: 'merchant', width: 20 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Account', key: 'account', width: 15 }
    ];

    // Add data rows
    transactions.forEach((t) => {
      worksheet.addRow({
        date: t.transactionDate.toISOString().split('T')[0],
        description: t.description,
        merchant: t.merchant || '',
        category: t.category?.name || '',
        amount: t.amount.toFixed(2),
        type: t.type,
        account: t.account?.name || ''
      });
    });

    // Format amount column as currency
    worksheet.getColumn('amount').numFmt = '$#,##0.00';

    // Add alternating row colors
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && rowNumber % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' }
        };
      }
    });

    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }

  /**
   * Export income statement to PDF
   */
  async exportReportToPDF(
    report: IncomeStatement,
    fileName: string = 'income_statement.pdf'
  ): Promise<Buffer> {
    const doc = new Document();

    const styles = StyleSheet.create({
      title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20
      },
      sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 15,
        marginBottom: 10
      },
      row: {
        flexDirection: 'row',
        borderBottom: '1px solid #ccc',
        paddingBottom: 5,
        marginBottom: 5
      },
      label: {
        flex: 1,
        fontSize: 12
      },
      amount: {
        flex: 0.3,
        fontSize: 12,
        textAlign: 'right'
      },
      total: {
        fontWeight: 'bold',
        fontSize: 14
      }
    });

    return new Promise((resolve, reject) => {
      // Render document to buffer
      doc.render((err: any, buffer: Buffer) => {
        if (err) reject(err);
        resolve(buffer);
      });
    });
  }
}

export const exportService = new ExportService();
```

---

## Error Handling & Logging

### 1. Logging Service

```typescript
// lib/utils/logger.ts

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export class Logger {
  private context: string;
  private isDevelopment = process.env.NODE_ENV === 'development';

  constructor(context: string) {
    this.context = context;
  }

  debug(message: string, data?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: Record<string, any>) {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: Record<string, any>) {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, data);
  }

  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, any>
  ) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      ...(data && { data })
    };

    if (this.isDevelopment) {
      console.log(JSON.stringify(logEntry, null, 2));
    } else {
      // In production, send to logging service (e.g., Sentry, DataDog)
      if (level === LogLevel.ERROR) {
        console.error(JSON.stringify(logEntry));
      } else {
        console.log(JSON.stringify(logEntry));
      }
    }
  }
}

export const createLogger = (context: string) => new Logger(context);
export const logger = createLogger('app');
```

### 2. Request/Response Logging

```typescript
// lib/middleware/loggingMiddleware.ts

export function withLogging<T extends any[], R>(
  handler: (req: Request, ...args: T) => Promise<R>,
  context: string
) {
  return async (request: Request, ...args: T) => {
    const logger = createLogger(context);
    const startTime = Date.now();

    try {
      const response = await handler(request, ...args);
      const duration = Date.now() - startTime;

      logger.info(`${request.method} ${request.url}`, {
        status: response.status,
        duration: `${duration}ms`
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`${request.method} ${request.url}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });
      throw error;
    }
  };
}
```

---

## Database Query Optimization

### 1. Query Patterns & Indexes

```typescript
// lib/database/queryBuilder.ts

export class QueryBuilder {
  /**
   * Optimized transaction query with common patterns
   */
  async getTransactionsSummary(
    userId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<{
    total: number;
    income: number;
    expenses: number;
    categories: Array<{ category: string; amount: number }>;
  }> {
    // Use aggregation for performance
    const transactions = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        transactionDate: {
          gte: dateRange.start,
          lte: dateRange.end
        }
      },
      _sum: {
        amount: true
      },
      _count: true
    });

    // Execute separate queries for totals (better for index usage)
    const [incomeSummary, expenseSummary] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'income',
          transactionDate: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        },
        _sum: { amount: true }
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'expense',
          transactionDate: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        },
        _sum: { amount: true }
      })
    ]);

    return {
      total: Math.abs((incomeSummary._sum.amount || 0) - (expenseSummary._sum.amount || 0)),
      income: incomeSummary._sum.amount || 0,
      expenses: Math.abs(expenseSummary._sum.amount || 0),
      categories: transactions.map((t) => ({
        category: t.categoryId || 'uncategorized',
        amount: t._sum.amount || 0
      }))
    };
  }

  /**
   * Batch query optimization
   */
  async getMultipleUserSummaries(userIds: string[]): Promise<
    Map<string, { income: number; expenses: number }>
  > {
    // Single query instead of N queries
    const results = await prisma.transaction.groupBy({
      by: ['userId', 'type'],
      where: {
        userId: { in: userIds }
      },
      _sum: { amount: true }
    });

    const map = new Map<string, { income: number; expenses: number }>();

    results.forEach((result) => {
      if (!map.has(result.userId)) {
        map.set(result.userId, { income: 0, expenses: 0 });
      }

      const summary = map.get(result.userId)!;
      if (result.type === 'income') {
        summary.income = result._sum.amount || 0;
      } else {
        summary.expenses = Math.abs(result._sum.amount || 0);
      }
    });

    return map;
  }
}

export const queryBuilder = new QueryBuilder();
```

### 2. Key Indexes for Performance

```sql
-- Primary lookup indexes
CREATE INDEX idx_transactions_user_date 
  ON transactions(userId, transactionDate DESC);

CREATE INDEX idx_transactions_category_date 
  ON transactions(categoryId, transactionDate DESC);

CREATE INDEX idx_transactions_account_date 
  ON transactions(accountId, transactionDate DESC);

-- Search indexes
CREATE INDEX idx_transactions_source_id 
  ON transactions(sourceId) WHERE isDuplicate = FALSE;

CREATE INDEX idx_transactions_plaid_id 
  ON transactions(plaidTransactionId) WHERE plaidTransactionId IS NOT NULL;

-- Full-text search
CREATE INDEX idx_transactions_search 
  ON transactions USING GIN(
    to_tsvector('english', description || ' ' || COALESCE(merchant, ''))
  );

-- Budget period queries
CREATE INDEX idx_budgets_period 
  ON budgets(userId, year, month);

-- Account sync tracking
CREATE INDEX idx_accounts_sync_cursor 
  ON accounts(userId, lastSyncAt DESC);

-- Audit trails
CREATE INDEX idx_audit_logs_entity 
  ON audit_logs(userId, entityType, entityId);
```

---

## Implementation Checklist

### Phase 1: Foundation (Week 1-2)

- [ ] Set up Next.js project structure
- [ ] Configure Prisma ORM with PostgreSQL
- [ ] Implement authentication (JWT + refresh tokens)
- [ ] Create base middleware stack (auth, error handling)
- [ ] Set up logging and monitoring
- [ ] Create database migrations
- [ ] Implement role-based access control

### Phase 2: Core Transactions API (Week 2-3)

- [ ] Implement transaction CRUD endpoints
- [ ] Build transaction normalization pipeline
- [ ] Create deduplication algorithm
- [ ] Build CSV import/parsing
- [ ] Implement transaction search and filtering
- [ ] Add transaction validation

### Phase 3: Categorization Engine (Week 3-4)

- [ ] Implement rule-based categorization
- [ ] Integrate Claude API for AI categorization
- [ ] Build batch categorization service
- [ ] Create rule management endpoints
- [ ] Add category management CRUD

### Phase 4: Financial Features (Week 4-5)

- [ ] Implement budget calculator
- [ ] Build budget tracking endpoints
- [ ] Create financial report generation (income statement, cash flow)
- [ ] Add report export (PDF, Excel, CSV)
- [ ] Implement budget alerts

### Phase 5: Plaid Integration (Week 5-6)

- [ ] Set up Plaid API wrapper
- [ ] Implement account linking flow
- [ ] Build Plaid webhook handler
- [ ] Create transaction sync service
- [ ] Implement incremental sync with cursor

### Phase 6: Optimization & Polish (Week 6-7)

- [ ] Implement database query optimization
- [ ] Add caching layer (Redis)
- [ ] Optimize API response times
- [ ] Add rate limiting and throttling
- [ ] Implement request compression
- [ ] Add API documentation

### Phase 7: Testing & Deployment (Week 7-8)

- [ ] Write integration tests
- [ ] Set up error tracking (Sentry)
- [ ] Configure monitoring and alerts
- [ ] Load testing
- [ ] Production deployment
- [ ] Documentation and knowledge transfer

---

## Configuration Examples

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/budget_db

# JWT
JWT_SECRET=your-secret-key-here-min-32-chars

# Plaid
PLAID_CLIENT_ID=xxx
PLAID_SECRET=xxx
PLAID_ENV=sandbox

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# AWS (optional)
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=budget-exports

# Redis
REDIS_URL=redis://localhost:6379

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Prisma Schema Extensions

```prisma
model Transaction {
  id                  String      @id @default(cuid())
  userId              String
  accountId           String
  description         String
  amount              Decimal     @db.Decimal(15, 2)
  type                String      // income, expense, transfer
  transactionDate     DateTime
  postedDate          DateTime?
  source              String      // plaid, csv, manual
  sourceId            String?     @unique
  categoryId          String?
  subcategoryId       String?
  merchant            String?
  notes               String?
  tags                String[]
  isReconciled        Boolean     @default(false)
  isDuplicate         Boolean     @default(false)
  duplicateOf         String?
  plaidTransactionId  String?     @unique
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt

  user                User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  account             Account     @relation(fields: [accountId], references: [id], onDelete: Cascade)
  category            Category?   @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  auditLogs           AuditLog[]

  @@index([userId, transactionDate])
  @@index([categoryId, transactionDate])
  @@index([sourceId])
  @@fulltext([description, merchant])
}

model Rule {
  id              String      @id @default(cuid())
  userId          String
  name            String
  description     String?
  pattern         String
  matchType       String      // contains, equals, regex, etc
  searchField     String      // description, merchant, amount
  categoryId      String
  subcategoryId   String?
  autoApply       Boolean     @default(true)
  isActive        Boolean     @default(true)
  priority        Int         @default(0)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  category        Category    @relation(fields: [categoryId], references: [id])

  @@index([userId, priority])
}
```

---

## Performance Targets

- API response time: < 200ms (p95)
- Dashboard load: < 1s
- Transaction import: < 5s for 1000 transactions
- Report generation: < 3s
- Database query: < 100ms (p95)

---

## Security Checklist

- [ ] All API endpoints require authentication
- [ ] Rate limiting on all public endpoints
- [ ] Input validation with Zod schemas
- [ ] SQL injection prevention (Prisma)
- [ ] XSS protection (React escaping)
- [ ] CSRF tokens on state-changing operations
- [ ] Sensitive data encryption (AES-256)
- [ ] Audit logging for all changes
- [ ] HTTPS only in production
- [ ] Environment variable secrets management

---

## Monitoring & Alerts

### Key Metrics

- API error rate (threshold: > 1%)
- Database connection pool saturation
- Response time p95/p99
- Transaction processing queue depth
- Plaid API failures
- Authentication failures

### Alert Rules

- Error rate exceeds 2%
- Response time p95 > 500ms
- Database connections > 80% pool
- Plaid sync failures > 3 consecutive
- Disk usage > 80%

---

## References

- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Prisma ORM](https://www.prisma.io/docs)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance.html)
- [Plaid Documentation](https://plaid.com/docs)
- [Anthropic API](https://docs.anthropic.com)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

