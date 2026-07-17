# Security Architecture - Budget Tool

Comprehensive security framework for the Budget Tool personal finance platform. This document covers authentication, authorization, encryption, compliance, and operational security.

---

## Table of Contents

1. [Authentication Strategy](#authentication-strategy)
2. [Authorization & Access Control](#authorization--access-control)
3. [Data Encryption](#data-encryption)
4. [API Security](#api-security)
5. [Frontend Security](#frontend-security)
6. [Infrastructure Security](#infrastructure-security)
7. [Compliance & Legal](#compliance--legal)
8. [Incident Response & Monitoring](#incident-response--monitoring)
9. [Security Checklist](#security-checklist)

---

## Authentication Strategy

### Overview

Multi-layered authentication system supporting different access patterns with focus on user convenience and security.

### JWT + httpOnly Cookies (Primary)

**Why JWT + Cookies over Session Storage?**

| Aspect | JWT + Cookies | Sessions | API Keys |
|--------|---------------|----------|----------|
| **Stateless** | ✓ | ✗ | ✓ |
| **XSS Safe** | ✓ (httpOnly) | ✓ | ✓ |
| **CSRF Needed** | ✓ | ✓ | ✗ |
| **Mobile/API** | ✓ | ~ | ✓ |
| **Scalability** | ✓ | ✗ | ✓ |

**Implementation:**

```typescript
// Backend: Generate JWT on login
const jwt = sign(
  {
    userId: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
  },
  process.env.JWT_SECRET,
  {
    algorithm: 'HS256',
    expiresIn: '15m', // Short-lived access token
  }
);

// Store in httpOnly cookie (cannot be accessed via JavaScript)
res.setHeader('Set-Cookie', [
  serialize('auth_token', jwt, {
    httpOnly: true,    // ✓ XSS protection
    secure: true,      // ✓ HTTPS only
    sameSite: 'strict', // ✓ CSRF protection
    maxAge: 15 * 60,   // 15 minutes
    path: '/',
  }),
  serialize('refresh_token', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/api/auth/refresh',
  }),
]);
```

**Security Properties:**
- `httpOnly`: Cookie inaccessible to JavaScript (prevents XSS token theft)
- `secure`: Only sent over HTTPS (prevents man-in-the-middle)
- `sameSite=Strict`: Only sent with same-site requests (CSRF protection)
- `path=/api/auth/refresh`: Refresh token only sent to refresh endpoint
- Short expiration: Access tokens valid for 15 minutes only

### Refresh Token Rotation

```typescript
// On refresh endpoint
export async function refreshToken(req, res) {
  const oldRefreshToken = req.cookies.refresh_token;
  
  // Validate old token
  const decoded = verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET);
  
  // Check if token was revoked (stored in Redis)
  if (await redis.get(`revoked_token:${decoded.jti}`)) {
    res.status(401).json({ error: 'Token revoked' });
    return;
  }
  
  // Generate new tokens
  const newAccessToken = sign({ /* payload */ }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });
  
  const newRefreshToken = sign(
    { /* payload */ },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  // Revoke old refresh token
  await redis.setex(`revoked_token:${decoded.jti}`, 7 * 24 * 60 * 60, 'true');
  
  // Return new tokens in cookies
  setTokenCookies(res, newAccessToken, newRefreshToken);
  res.json({ success: true });
}
```

**Refresh Token Rotation Benefits:**
- Limits window of exposure if refresh token is leaked
- Detects compromise if multiple refresh attempts occur
- Implements sliding session expiration

### Password Hashing & Validation

**Algorithm: bcrypt with minimum cost factor of 12**

```typescript
import bcrypt from 'bcrypt';

// Registration
export async function hashPassword(plaintext: string): Promise<string> {
  const salt = await bcrypt.genSalt(12); // CPU-intensive, ~100ms
  return bcrypt.hash(plaintext, salt);
}

// Login verification
export async function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash); // Time-constant comparison
}

// Example: Store in database
const hash = await hashPassword(password);
await db.users.create({
  email,
  passwordHash: hash, // NEVER store plaintext
  name,
});
```

**Password Validation Rules:**

```typescript
// Minimum 12 characters
const MIN_LENGTH = 12;

// Must include character classes
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{12,}$/;

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors = [];
  
  if (password.length < MIN_LENGTH) {
    errors.push(`Minimum 12 characters (${password.length} provided)`);
  }
  if (!PASSWORD_REGEX.test(password)) {
    errors.push('Must include uppercase, lowercase, number, and special character');
  }
  if (password === password.toLowerCase() || password === password.toUpperCase()) {
    errors.push('Cannot be all uppercase or lowercase');
  }
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Cannot contain 3+ repeated characters');
  }
  if (password.includes('password') || password.includes('123456')) {
    errors.push('Cannot contain common patterns');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
```

**Why bcrypt?**
- CPU-intensive hashing makes brute-force attacks computationally expensive
- Adaptive cost factor allows increasing security as hardware improves
- Built-in salt handling prevents rainbow table attacks
- Time-constant comparison prevents timing attacks

### Session Timeout

```typescript
// Session expiration times
const SESSION_CONFIG = {
  accessTokenExpiry: 15 * 60, // 15 minutes
  refreshTokenExpiry: 7 * 24 * 60 * 60, // 7 days
  absoluteMaxAge: 30 * 24 * 60 * 60, // 30 days max (reauth required)
  inactivityTimeout: 24 * 60 * 60, // 24 hours inactivity
};

// Track last activity for inactivity timeout
export async function updateLastActivity(userId: string) {
  await redis.setex(
    `user_activity:${userId}`,
    SESSION_CONFIG.inactivityTimeout,
    new Date().toISOString()
  );
}

// Check if session is still valid
export async function validateSession(
  userId: string,
  token: { iat: number; exp: number }
) {
  const now = Math.floor(Date.now() / 1000);
  
  // Token expired
  if (now > token.exp) {
    return { valid: false, reason: 'Token expired' };
  }
  
  // Check inactivity
  const lastActivity = await redis.get(`user_activity:${userId}`);
  if (!lastActivity) {
    return { valid: false, reason: 'Session expired due to inactivity' };
  }
  
  // Absolute maximum session age (30 days)
  if (now - token.iat > SESSION_CONFIG.absoluteMaxAge) {
    return { valid: false, reason: 'Session requires re-authentication' };
  }
  
  return { valid: true };
}
```

### Email Verification Flow

**Purpose:** Prevent account takeover via fake email addresses.

```typescript
// 1. User registers
export async function signup(email: string, password: string, name: string) {
  const user = await db.users.create({
    email,
    passwordHash: await hashPassword(password),
    name,
    emailVerified: false,
    emailVerificationToken: generateSecureToken(), // 32 random bytes, hex-encoded
    emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
  });
  
  // Send verification email
  await emailService.sendVerificationEmail(user.email, {
    verificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${user.emailVerificationToken}`,
    expiresIn: '24 hours',
  });
  
  return { userId: user.id, message: 'Check your email to verify' };
}

// 2. User clicks link in email
export async function verifyEmail(token: string) {
  const user = await db.users.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerificationExpiry: { gt: new Date() }, // Not expired
    },
  });
  
  if (!user) {
    throw new Error('Invalid or expired verification token');
  }
  
  await db.users.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    },
  });
  
  return { success: true, message: 'Email verified' };
}

// 3. Resend verification email (rate-limited)
export async function resendVerificationEmail(email: string) {
  // Rate limit: 3 attempts per 24 hours
  const attempts = await redis.incr(`verification_attempts:${email}`);
  if (attempts === 1) {
    await redis.expire(`verification_attempts:${email}`, 24 * 60 * 60);
  }
  
  if (attempts > 3) {
    throw new Error('Too many verification email requests. Try again in 24 hours.');
  }
  
  // Same flow as signup
  await signup(email, null, null); // Resend token
}

// 4. Unverified users cannot access app
export function requireEmailVerified(req, res, next) {
  if (!req.user.emailVerified) {
    res.status(403).json({
      error: 'Email not verified',
      action: 'redirect_to_verification',
    });
    return;
  }
  next();
}
```

**Security Properties:**
- Tokens expire after 24 hours (limits window of attack)
- Tokens are random and cryptographically secure (not guessable)
- Rate limiting prevents email bombing
- Unverified users cannot access application

### Password Reset Flow

**Purpose:** Secure password recovery without storing recovery codes.

```typescript
// 1. User requests password reset
export async function requestPasswordReset(email: string) {
  const user = await db.users.findUnique({ where: { email } });
  
  if (!user) {
    // Don't reveal if email exists (prevents user enumeration)
    return { success: true, message: 'If email exists, check your inbox' };
  }
  
  const resetToken = generateSecureToken(); // 32 random bytes
  const resetTokenHash = await hashPassword(resetToken); // bcrypt hash
  
  await db.users.update({
    where: { id: user.id },
    data: {
      passwordResetToken: resetTokenHash,
      passwordResetExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      passwordResetAttempts: 0,
    },
  });
  
  // Send email with reset link
  await emailService.sendPasswordResetEmail(user.email, {
    resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
    expiresIn: '1 hour',
    ipAddress: req.ip,
    timestamp: new Date(),
  });
  
  return { success: true, message: 'If email exists, check your inbox' };
}

// 2. User submits new password with reset token
export async function resetPassword(token: string, newPassword: string) {
  // Validate new password
  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    throw new Error(`Invalid password: ${validation.errors.join(', ')}`);
  }
  
  // Find user with valid reset token
  const users = await db.users.findMany({
    where: { passwordResetExpiry: { gt: new Date() } },
  });
  
  // Verify token against stored hash (timing-safe comparison)
  const user = users.find(u => 
    bcrypt.compareSync(token, u.passwordResetToken)
  );
  
  if (!user) {
    throw new Error('Invalid or expired password reset token');
  }
  
  // Prevent brute force on reset endpoint
  if (user.passwordResetAttempts >= 5) {
    throw new Error('Too many reset attempts. Request a new reset link.');
  }
  
  // Update password
  await db.users.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      passwordResetToken: null,
      passwordResetExpiry: null,
      passwordResetAttempts: 0,
      lastPasswordChangeAt: new Date(),
    },
  });
  
  // Invalidate all active sessions
  await redis.del(`user_sessions:${user.id}`);
  
  // Log security event
  await auditLog.create({
    userId: user.id,
    action: 'PASSWORD_RESET',
    severity: 'medium',
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  
  return { success: true, message: 'Password reset successfully' };
}
```

**Security Properties:**
- Reset token only valid for 1 hour (limits window of attack)
- Reset tokens are hashed in database (even admin cannot see them)
- Brute force protection (5 attempts max)
- User email enumeration prevented (generic success message)
- All active sessions invalidated (forces re-login)
- Audit logging for compliance

---

## Authorization & Access Control

### Role-Based Access Control (RBAC)

**User Roles:**

```typescript
enum UserRole {
  USER = 'user',           // Standard user - full access to own data
  ADMIN = 'admin',         // Platform admin - system-wide access
  SUPPORT = 'support',     // Support staff - can view/assist users
  READONLY = 'readonly',   // Audit/compliance - read-only access
}

interface User {
  id: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  lastLoginAt: Date;
}

// Permission matrix
const ROLE_PERMISSIONS = {
  [UserRole.USER]: [
    'transactions:read_own',
    'transactions:create_own',
    'transactions:update_own',
    'transactions:delete_own',
    'accounts:read_own',
    'accounts:create_own',
    'categories:read_own',
    'reports:read_own',
    'settings:read_own',
    'settings:update_own',
  ],
  [UserRole.ADMIN]: [
    '*', // All permissions
  ],
  [UserRole.SUPPORT]: [
    'users:read_all',
    'transactions:read_all',
    'auditlogs:read_all',
  ],
  [UserRole.READONLY]: [
    'users:read_all',
    'transactions:read_all',
    'accounts:read_all',
    'auditlogs:read_all',
  ],
};
```

### Permission Checking Middleware

```typescript
// Middleware to check permissions
export function requirePermission(requiredPermission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user; // Set by auth middleware
    
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Check if user has permission
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    const hasPermission = 
      userPermissions.includes('*') || 
      userPermissions.includes(requiredPermission);
    
    if (!hasPermission) {
      // Log unauthorized access attempt
      await auditLog.create({
        userId: user.id,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        severity: 'high',
        details: { requiredPermission, deniedReason: 'insufficient_permissions' },
      });
      
      res.status(403).json({ 
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
      });
      return;
    }
    
    next();
  };
}

// Usage in routes
router.get(
  '/api/transactions',
  requireAuth,
  requirePermission('transactions:read_own'),
  getTransactions
);
```

### Multi-Tenancy Data Isolation

**Ensure users can only access their own data:**

```typescript
// Query builder middleware
function withUserContext(query: any, userId: string) {
  return query.where({ userId });
}

// Route handlers
export async function getTransactions(req, res) {
  const userId = req.user.id;
  
  const transactions = await db.transactions.findMany({
    where: withUserContext({ accountId: req.query.accountId }, userId),
    orderBy: { createdAt: 'desc' },
  });
  
  // Verify userId in response matches request context
  transactions.forEach(t => {
    if (t.userId !== userId) {
      throw new Error('Data isolation violation detected');
    }
  });
  
  res.json(transactions);
}

// Row-Level Security (RLS) in Postgres (alternative)
// Better approach if using Postgres instead of PocketBase
CREATE POLICY users_can_read_own_transactions
  ON transactions
  FOR SELECT
  USING (auth.uid() = userId);

CREATE POLICY users_can_update_own_transactions
  ON transactions
  FOR UPDATE
  USING (auth.uid() = userId);
```

---

## Data Encryption

### Encryption Strategy

**Three layers of data protection:**

| Layer | Method | Keys | Data |
|-------|--------|------|------|
| **Transit** | TLS 1.3 | Auto (Let's Encrypt) | All data in flight |
| **Database** | AES-256-GCM | Application-level | Sensitive fields |
| **Rest** | Volume encryption | OS-level | All disk data |

### Field-Level Encryption (Application Layer)

**Sensitive fields to encrypt:**
- Social Security Numbers (SSN)
- Account numbers
- Routing numbers
- Plaid access tokens
- Date of birth

```typescript
import crypto from 'crypto';

class EncryptionService {
  private encryptionKey: Buffer;
  private algorithm = 'aes-256-gcm';
  
  constructor(masterKey: string) {
    // Master key: 32 bytes for AES-256
    this.encryptionKey = crypto
      .createHash('sha256')
      .update(masterKey)
      .digest();
  }
  
  encrypt(plaintext: string): { ciphertext: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16); // Initialization vector
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    
    const authTag = cipher.getAuthTag(); // Authentication tag prevents tampering
    
    return {
      ciphertext,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }
  
  decrypt(encrypted: { ciphertext: string; iv: string; authTag: string }): string {
    const iv = Buffer.from(encrypted.iv, 'hex');
    const authTag = Buffer.from(encrypted.authTag, 'hex');
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let plaintext = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');
    
    return plaintext;
  }
}

// Usage in database models
interface Account {
  id: string;
  userId: string;
  name: string;
  accountNumber: { ciphertext: string; iv: string; authTag: string }; // Encrypted
  routingNumber: { ciphertext: string; iv: string; authTag: string }; // Encrypted
  plaidAccessToken: { ciphertext: string; iv: string; authTag: string }; // Encrypted
}

export async function createAccount(
  userId: string,
  accountData: {
    name: string;
    accountNumber: string;
    routingNumber: string;
    plaidAccessToken: string;
  }
) {
  const encryptionService = new EncryptionService(
    process.env.ENCRYPTION_MASTER_KEY
  );
  
  const account = await db.accounts.create({
    data: {
      userId,
      name: accountData.name,
      accountNumber: encryptionService.encrypt(accountData.accountNumber),
      routingNumber: encryptionService.encrypt(accountData.routingNumber),
      plaidAccessToken: encryptionService.encrypt(accountData.plaidAccessToken),
    },
  });
  
  return account;
}

export async function getAccount(accountId: string, userId: string) {
  const encryptionService = new EncryptionService(
    process.env.ENCRYPTION_MASTER_KEY
  );
  
  const account = await db.accounts.findFirst({
    where: { id: accountId, userId }, // Ensure user owns account
  });
  
  if (!account) return null;
  
  // Decrypt sensitive fields before returning
  return {
    ...account,
    accountNumber: encryptionService.decrypt(account.accountNumber),
    routingNumber: encryptionService.decrypt(account.routingNumber),
    plaidAccessToken: encryptionService.decrypt(account.plaidAccessToken),
  };
}
```

**Why AES-256-GCM?**
- AES-256: Strong encryption standard, approved by NSA for top-secret data
- GCM mode: Provides both confidentiality and authenticity (detects tampering)
- Authenticated encryption prevents tampering and replay attacks
- Industry standard for sensitive data

### Encryption Key Management

```typescript
// Environment-based key rotation
const ENCRYPTION_KEYS = {
  current: process.env.ENCRYPTION_MASTER_KEY,
  previous: process.env.ENCRYPTION_MASTER_KEY_PREVIOUS, // For decryption during rotation
};

export async function rotateEncryptionKeys() {
  // 1. Generate new key
  const newKey = crypto.randomBytes(32).toString('hex');
  
  // 2. Verify it works
  const testEncrypt = new EncryptionService(newKey).encrypt('test');
  new EncryptionService(newKey).decrypt(testEncrypt); // Should not throw
  
  // 3. Re-encrypt all sensitive data
  const accounts = await db.accounts.findMany();
  const oldService = new EncryptionService(process.env.ENCRYPTION_MASTER_KEY);
  const newService = new EncryptionService(newKey);
  
  for (const account of accounts) {
    const decrypted = oldService.decrypt(account.accountNumber);
    const reEncrypted = newService.encrypt(decrypted);
    
    await db.accounts.update({
      where: { id: account.id },
      data: { accountNumber: reEncrypted },
    });
  }
  
  // 4. Update environment
  // Set ENCRYPTION_MASTER_KEY=<newKey> in production
  // Set ENCRYPTION_MASTER_KEY_PREVIOUS=<oldKey>
  
  // 5. Audit log
  await auditLog.create({
    userId: 'system',
    action: 'ENCRYPTION_KEY_ROTATED',
    severity: 'high',
  });
}
```

### Plaid Token Management

**Special handling for Plaid access tokens (can be revoked):**

```typescript
interface PlaidAccount {
  id: string;
  userId: string;
  plaidAccessToken: EncryptedString;
  plaidAccessTokenExpiry: Date;
  plaidRefreshToken: EncryptedString; // If available in Plaid setup
}

export async function handlePlaidLinkSuccess(
  userId: string,
  publicToken: string
) {
  // 1. Exchange public token for access token
  const plaidResponse = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });
  
  const { access_token, item_id } = plaidResponse.data;
  
  // 2. Encrypt and store access token
  const encryptionService = new EncryptionService(
    process.env.ENCRYPTION_MASTER_KEY
  );
  
  const account = await db.plaidAccounts.create({
    data: {
      userId,
      itemId: item_id,
      plaidAccessToken: encryptionService.encrypt(access_token),
      plaidAccessTokenExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });
  
  // 3. Schedule token refresh
  await scheduleTokenRefresh(account.id);
  
  return account;
}

// Token refresh job (cron)
export async function refreshPlaidTokens() {
  const accounts = await db.plaidAccounts.findMany({
    where: {
      plaidAccessTokenExpiry: {
        lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Within 7 days
      },
    },
  });
  
  for (const account of accounts) {
    try {
      // Use refresh token if available, else request new one
      const encryptionService = new EncryptionService(
        process.env.ENCRYPTION_MASTER_KEY
      );
      
      const decryptedToken = encryptionService.decrypt(
        account.plaidAccessToken
      );
      
      // Plaid token refresh flow
      const newToken = await plaidClient.itemAccessTokenInvalidate({
        access_token: decryptedToken,
      });
      
      await db.plaidAccounts.update({
        where: { id: account.id },
        data: {
          plaidAccessToken: encryptionService.encrypt(newToken),
          plaidAccessTokenExpiry: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000
          ),
        },
      });
    } catch (error) {
      // Log failure
      await auditLog.create({
        userId: account.userId,
        action: 'PLAID_TOKEN_REFRESH_FAILED',
        severity: 'high',
        details: { accountId: account.id, error: error.message },
      });
    }
  }
}
```

---

## API Security

### HTTPS/TLS Configuration

**Enforce HTTPS everywhere:**

```typescript
// 1. Redirect HTTP to HTTPS in Nginx
// /etc/nginx/conf.d/ssl.conf
server {
  listen 80;
  server_name _;
  
  # Redirect all HTTP to HTTPS
  return 301 https://$host$request_uri;
}

// 2. HTTPS with TLS 1.3
server {
  listen 443 ssl http2;
  server_name budgettool.com api.budgettool.com;
  
  # TLS 1.3 and 1.2 only
  ssl_protocols TLSv1.3 TLSv1.2;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;
  
  # Let's Encrypt certificates (auto-renewed by certbot)
  ssl_certificate /etc/letsencrypt/live/budgettool.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/budgettool.com/privkey.pem;
  
  # HSTS - force browsers to use HTTPS for 1 year
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
  
  # Security headers
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Referrer-Policy "no-referrer-when-downgrade" always;
  add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
  
  location / {
    proxy_pass http://localhost:5173;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

**Certificate Monitoring:**

```bash
#!/bin/bash
# /usr/local/bin/check_ssl_expiry.sh

DOMAIN="budgettool.com"
DAYS_UNTIL_EXPIRY=$(( ($(date -d "$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)" +%s) - $(date +%s)) / 86400 ))

if [ "$DAYS_UNTIL_EXPIRY" -lt 30 ]; then
  echo "WARNING: SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
  # Send alert email
  mail -s "SSL Certificate Expiration Alert" admin@budgettool.com
fi
```

### CSRF Protection

**Cross-Site Request Forgery (CSRF) Prevention:**

```typescript
// 1. Generate CSRF token on page load
import csrf from 'csurf';
import cookieParser from 'cookie-parser';

const app = express();
app.use(cookieParser());
app.use(csrf({ cookie: true }));

// 2. Return CSRF token to frontend
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// 3. Frontend includes CSRF token in request
// fetch('/api/transactions', {
//   method: 'POST',
//   headers: {
//     'X-CSRF-Token': csrfToken, // From step 1
//     'Content-Type': 'application/json',
//   },
//   body: JSON.stringify(transactionData),
// });

// 4. Backend validates CSRF token
app.post(
  '/api/transactions',
  requireAuth,
  (req, res, next) => {
    // csrf middleware validates X-CSRF-Token header
    next();
  },
  createTransaction
);

// Alternative: SameSite cookie already provides CSRF protection
// Set-Cookie: auth_token=...; SameSite=Strict
// This prevents cookies from being sent in cross-site requests
```

### XSS Prevention

**Cross-Site Scripting (XSS) Attack Prevention:**

```typescript
// 1. Content Security Policy (CSP) headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'", // Only allow resources from same origin
      "script-src 'self' 'unsafe-inline' cdn.jsdelivr.net", // Scripts from self and specific CDNs
      "style-src 'self' 'unsafe-inline'", // Styles from self
      "img-src 'self' data: https:", // Images from self and HTTPS
      "font-src 'self' fonts.googleapis.com", // Fonts from self
      "connect-src 'self'", // API calls only to self
      "frame-ancestors 'none'", // Cannot be embedded in iframes
      "base-uri 'self'", // Base URL must be same origin
      "form-action 'self'", // Forms can only submit to same origin
    ].join('; ')
  );
  next();
});

// 2. Escape user-generated content in React (automatic)
// React auto-escapes by default
export function TransactionItem({ transaction }) {
  return (
    <div>
      {/* User input automatically escaped */}
      <p>{transaction.description}</p>
      {/* This is safe even if description contains <script> */}
    </div>
  );
}

// 3. Validate and sanitize input
import DOMPurify from 'dompurify';

export function saveCategory(name: string, description: string) {
  // Remove any HTML/script tags
  const sanitizedName = DOMPurify.sanitize(name, { ALLOWED_TAGS: [] });
  const sanitizedDescription = DOMPurify.sanitize(description, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'], // Only safe HTML
  });
  
  // Store sanitized values
  return db.categories.create({
    data: {
      name: sanitizedName,
      description: sanitizedDescription,
    },
  });
}

// 4. Avoid innerHTML and dangerouslySetInnerHTML
// ❌ BAD
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✓ GOOD
<div>{userInput}</div>

// 5. Validate URLs to prevent javascript:// protocol
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http:// and https://
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
```

### SQL Injection Prevention (via Prisma)

**Prisma ORM prevents SQL injection automatically:**

```typescript
// ✓ GOOD - Parameterized queries
const transactions = await db.transactions.findMany({
  where: {
    userId: userId, // Safely parameterized
    description: { contains: searchTerm }, // Safely parameterized
  },
});

// ❌ BAD - String concatenation (NEVER do this)
const query = `SELECT * FROM transactions WHERE userId = '${userId}'`;
// If userId = "' OR '1'='1", this breaks

// ✓ GOOD - Raw queries with parameterization (when necessary)
const result = await db.$queryRaw`
  SELECT * FROM transactions 
  WHERE userId = ${userId} 
  AND description ILIKE ${`%${searchTerm}%`}
`;

// Input validation also helps as defense-in-depth
function validateTransactionFilter(filter: any) {
  const schema = z.object({
    userId: z.string().uuid(),
    startDate: z.date(),
    endDate: z.date(),
    categoryId: z.string().uuid().optional(),
    minAmount: z.number().min(0).optional(),
    maxAmount: z.number().min(0).optional(),
  });
  
  return schema.parse(filter);
}
```

### API Key Authentication (for Programmatic Access)

**For third-party integrations and mobile apps:**

```typescript
// 1. Generate API key
export async function createApiKey(
  userId: string,
  name: string,
  permissions: string[]
) {
  const apiKeySecret = crypto.randomBytes(32).toString('hex');
  const apiKeyHash = await hashPassword(apiKeySecret);
  
  const apiKey = await db.apiKeys.create({
    data: {
      userId,
      name,
      keyHash: apiKeyHash,
      displayKey: apiKeySecret.slice(-8), // Show last 8 chars for reference
      permissions,
      isActive: true,
      createdAt: new Date(),
    },
  });
  
  // Return key only once - user must save it
  return {
    id: apiKey.id,
    key: apiKeySecret,
    displayKey: apiKey.displayKey,
    message: 'Save this key securely. You will not see it again.',
  };
}

// 2. Validate API key in requests
export async function authenticateApiKey(req: Request): Promise<User | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const apiKey = authHeader.slice(7); // Remove "Bearer "
  
  // Find key by hash (for timing-attack resistance)
  const keys = await db.apiKeys.findMany({
    where: { isActive: true },
    include: { user: true },
  });
  
  // Time-constant comparison
  for (const key of keys) {
    if (await bcrypt.compare(apiKey, key.keyHash)) {
      // Check if still valid
      if (key.expiresAt && new Date() > key.expiresAt) {
        throw new Error('API key expired');
      }
      
      // Update last used
      await db.apiKeys.update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() },
      });
      
      return key.user;
    }
  }
  
  return null;
}

// 3. Use API key in route
export async function getTransactionsViaApi(req: Request, res: Response) {
  try {
    const user = await authenticateApiKey(req);
    
    if (!user) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }
    
    // Check API key permissions
    const key = await db.apiKeys.findFirst({
      where: {
        userId: user.id,
        keyHash: { /* compare with request key */ },
      },
    });
    
    if (!key?.permissions.includes('transactions:read')) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    
    const transactions = await db.transactions.findMany({
      where: { userId: user.id },
    });
    
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 4. Frontend usage with API key
// Never expose API key in browser code
// Only use for backend-to-backend communication or mobile apps

// fetch('https://api.budgettool.com/api/transactions', {
//   headers: {
//     'Authorization': 'Bearer sk_live_...',
//   },
// });
```

### Rate Limiting

**Prevent brute force attacks and DoS:**

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from 'redis';

const redisClient = redis.createClient();

// General API rate limit (per user)
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate_limit:api:',
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per user
  keyGenerator: (req) => req.user?.id || req.ip, // By user ID or IP
  skip: (req) => req.user?.role === 'admin', // Admins not rate limited
  message: 'Too many requests. Please try again later.',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});

// Strict rate limit for auth endpoints (per IP)
const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate_limit:auth:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes per IP
  keyGenerator: (req) => req.ip, // By IP address
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

// Use limiters in routes
app.post('/api/auth/login', authLimiter, loginHandler);
app.post('/api/auth/signup', authLimiter, signupHandler);
app.post('/api/password-reset', authLimiter, passwordResetHandler);

app.get('/api/transactions', apiLimiter, getTransactions);
app.post('/api/transactions', apiLimiter, createTransaction);

// Implement sliding window for more accuracy
export class SlidingWindowRateLimit {
  async isAllowed(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Remove old entries
    await redisClient.zremrangebyscore(
      `rate_limit:${key}`,
      0,
      windowStart
    );
    
    // Count requests in window
    const count = await redisClient.zcard(`rate_limit:${key}`);
    
    if (count >= limit) {
      return false;
    }
    
    // Add current request
    await redisClient.zadd(`rate_limit:${key}`, now, `${now}-${Math.random()}`);
    await redisClient.expire(`rate_limit:${key}`, Math.ceil(windowMs / 1000));
    
    return true;
  }
}
```

---

## Frontend Security

### Secure Communication

```typescript
// Use only HTTPS in production
export const API_CONFIG = {
  baseUrl:
    process.env.NODE_ENV === 'production'
      ? 'https://api.budgettool.com'
      : 'http://localhost:8090',
  withCredentials: true, // Send cookies with requests
};

// Fetch wrapper with security headers
export async function secureRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_CONFIG.baseUrl}${path}`, {
    ...options,
    credentials: 'include', // Include httpOnly cookies
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', // Indicate AJAX request
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }
  
  return response.json();
}
```

### State Management Security

```typescript
// Never store sensitive data in local storage or cookies
// ❌ NEVER DO THIS
localStorage.setItem('authToken', token); // Vulnerable to XSS

// ✓ GOOD - Use httpOnly cookies (set by server only)
// Server sets: Set-Cookie: auth_token=...; HttpOnly; Secure; SameSite=Strict

// Store non-sensitive user data in state management
import { create } from 'zustand';

interface UserStore {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  } | null;
  setUser: (user: UserStore['user']) => void;
  logout: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => {
    set({ user: null });
    // Call logout endpoint to clear httpOnly cookies
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  },
}));
```

### Form Security

```typescript
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Zod schema for client-side validation
const transactionSchema = z.object({
  description: z
    .string()
    .min(1, 'Description required')
    .max(500, 'Description too long')
    .refine((val) => !/<[^>]*>/g.test(val), 'HTML not allowed'),
  amount: z.number().positive('Amount must be positive'),
  categoryId: z.string().uuid('Invalid category'),
  date: z.date(),
});

export function TransactionForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(transactionSchema),
  });
  
  const onSubmit = async (data) => {
    try {
      // Send to server (server re-validates)
      const response = await secureRequest('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      // Handle success
    } catch (error) {
      // Display error without exposing internals
      console.error(error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register('description')}
        placeholder="Description"
        maxLength={500}
      />
      {errors.description && (
        <span className="error">{errors.description.message}</span>
      )}
      
      <input
        {...register('amount', { valueAsNumber: true })}
        type="number"
        step="0.01"
        min="0"
      />
      
      <button type="submit">Add Transaction</button>
    </form>
  );
}
```

---

## Infrastructure Security

### Docker Container Security

```dockerfile
# Dockerfile best practices
FROM node:20-alpine AS base

# ✓ Use specific version tags (not 'latest')
# ✓ Use Alpine for smaller attack surface
# ✓ Use multi-stage builds to keep final image small

# Don't run as root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app

# Copy with correct permissions
COPY --chown=nextjs:nodejs package*.json ./
COPY --chown=nextjs:nodejs tsconfig.json ./

# Install production dependencies only
RUN npm ci --only=production

# Use non-root user
USER nextjs

# Don't run as PID 1 (allows proper signal handling)
ENTRYPOINT ["node"]
CMD ["server.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { if (r.statusCode !== 200) throw new Error(r.statusCode) })"
```

**Docker Compose Security:**

```yaml
version: '3.9'
services:
  app:
    image: budget-tool:1.0.0
    container_name: budget-app
    
    # Resource limits
    mem_limit: 512m
    memswap_limit: 512m
    cpus: 1
    
    # Security options
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    
    read_only: true
    tmpfs: /tmp
    
    environment:
      NODE_ENV: production
      # Never include secrets in compose file
      # Use .env file or Docker secrets
    
    restart: unless-stopped
    
    ports:
      - "3000:3000"
    
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  db:
    image: postgres:15-alpine
    container_name: budget-db
    
    mem_limit: 512m
    memswap_limit: 512m
    cpus: 1
    
    security_opt:
      - no-new-privileges:true
    
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      POSTGRES_DB: budget_app
    
    secrets:
      - db_password
    
    volumes:
      - db_data:/var/lib/postgresql/data
    
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  db_data:

secrets:
  db_password:
    file: ./secrets/db_password.txt # Not committed to git
```

### Secrets Management

```bash
# 1. Never commit secrets to git
echo "*.env" >> .gitignore
echo "secrets/" >> .gitignore

# 2. Use environment variables in production
export DATABASE_URL="postgresql://user:pass@host/db"
export ENCRYPTION_MASTER_KEY="$(openssl rand -hex 32)"
export JWT_SECRET="$(openssl rand -hex 32)"

# 3. Use Docker secrets (for swarm)
echo "database_password_here" | docker secret create db_password -

# 4. Use environment files (development only)
# .env.local (never committed)
DATABASE_URL=postgresql://dev:dev@localhost/budget_dev
JWT_SECRET=dev_secret_only_for_development

# 5. CI/CD secrets (GitHub Actions, GitLab CI, etc.)
# Set secrets in CI/CD platform, not in code

# 6. Key rotation
# Periodically rotate secrets
# - Old secret: keep for backward compatibility
# - New secret: use for new tokens
# - Migration: re-encrypt data over time
```

### Firewall Rules

```bash
#!/bin/bash
# Setup UFW firewall on DigitalOcean droplet

# Enable firewall
ufw enable

# Default policy: deny incoming, allow outgoing
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (prevent lockout!)
ufw allow 22/tcp

# Allow HTTP (will redirect to HTTPS)
ufw allow 80/tcp

# Allow HTTPS
ufw allow 443/tcp

# Deny all other ports
ufw default deny incoming

# Status
ufw status verbose

# Log suspicious activity
ufw logging on
```

### OS-Level Security

```bash
#!/bin/bash
# System hardening script

# Update system
apt update && apt upgrade -y

# Disable IPv6 (if not needed)
echo "net.ipv6.conf.all.disable_ipv6 = 1" | sudo tee -a /etc/sysctl.conf
sysctl -p

# Enable SELinux/AppArmor
apt install -y apparmor apparmor-utils
systemctl enable apparmor

# Disable unnecessary services
systemctl disable bluetooth.service
systemctl disable cups.service

# Set up fail2ban (brute force protection)
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# fail2ban configuration
cat > /etc/fail2ban/jail.d/sshd.local << EOF
[sshd]
enabled = true
maxretry = 5
findtime = 3600
bantime = 3600
EOF

# SSH hardening
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# File permissions
chmod 644 /etc/passwd
chmod 644 /etc/group
chmod 000 /etc/shadow
chmod 000 /etc/gshadow

# Schedule security updates
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

---

## Compliance & Legal

### PCI DSS Compliance (Payment Processing)

**Note:** Budget Tool doesn't directly process payments but stores financial data.

```typescript
// PCI DSS Requirements applicable to budget tool:

// 1. Encrypt cardholder data (not applicable - no card storage)
// 2. Use strong cryptography for data in transit (✓ HTTPS/TLS)
// 3. Restrict access to data by business need (✓ RBAC)
// 4. Maintain vulnerability assessment program (✓ Regular audits)
// 5. Maintain information security policy (✓ This document)

// Key controls:
const PCI_CONTROLS = {
  dataEncryption: {
    protocol: 'TLS 1.3',
    cipherSuites: ['TLS_AES_256_GCM_SHA384', 'TLS_CHACHA20_POLY1305_SHA256'],
  },
  accessControl: {
    authentication: 'JWT + MFA',
    authorization: 'RBAC with least privilege',
  },
  monitoring: {
    auditLogs: 'All data access',
    alerts: 'Real-time anomaly detection',
  },
  testing: {
    penetrationTesting: 'Quarterly',
    vulnerabilityScans: 'Monthly',
  },
};
```

### GDPR Compliance (EU Data Protection)

```typescript
// GDPR Requirements:

interface GDPRCompliance {
  // 1. Data Collection - only collect what's necessary
  dataMinimization: {
    collect: ['email', 'password', 'name'],
    doNotCollect: ['gender', 'religion', 'health'],
  },
  
  // 2. Legal Basis for Processing
  legalBasis: 'User consent for account creation',
  
  // 3. Privacy Policy
  privacyPolicyUrl: 'https://budgettool.com/privacy',
  lastUpdated: '2024-01-01',
  
  // 4. Consent Management
  consentTracking: {
    termsOfService: true,
    privacyPolicy: true,
    marketing: false,
  },
}

// Implementation:

// Data export endpoint (Right to Data Portability)
export async function exportUserData(userId: string) {
  const user = await db.users.findUnique({
    where: { id: userId },
    include: {
      accounts: true,
      transactions: true,
      categories: true,
    },
  });
  
  // Return data in standard format (JSON or CSV)
  return JSON.stringify(user, null, 2);
}

// Data deletion endpoint (Right to be Forgotten)
export async function deleteUserData(userId: string) {
  // Verify user owns this data
  const user = await db.users.findUnique({ where: { id: userId } });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Delete all user data (cascade delete in DB)
  await db.users.delete({ where: { id: userId } });
  
  // Log deletion for compliance
  await auditLog.create({
    userId, // Use original userId even after deletion
    action: 'USER_DATA_DELETED',
    severity: 'high',
    timestamp: new Date(),
  });
}

// Right to rectification (update inaccurate data)
export async function updateUserProfile(
  userId: string,
  updates: Partial<User>
) {
  const allowedUpdates = ['name', 'email', 'timezone', 'currency'];
  
  // Only allow certain fields to be updated
  const filteredUpdates = Object.keys(updates)
    .filter((key) => allowedUpdates.includes(key))
    .reduce((obj, key) => {
      obj[key] = updates[key];
      return obj;
    }, {});
  
  return db.users.update({
    where: { id: userId },
    data: filteredUpdates,
  });
}

// Data retention policy
export async function pruneOldData() {
  // Delete transactions older than 7 years
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - 7);
  
  await db.transactions.deleteMany({
    where: { createdAt: { lt: cutoffDate } },
  });
  
  // Delete archived accounts after 1 year of closure
  await db.accounts.deleteMany({
    where: {
      isClosed: true,
      closedAt: { lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
    },
  });
}
```

### CCPA Compliance (California Privacy Rights)

```typescript
// CCPA Requirements (similar to GDPR):

interface CCPACompliance {
  // Right to know: What data is collected
  dataCollection: {
    categories: [
      'Identifiers (email, IP)',
      'Commercial data (transaction history)',
      'Internet activity (login times)',
    ],
    purposes: [
      'Provide services',
      'Improve product',
      'Prevent fraud',
    ],
  },
  
  // Right to delete
  deletionAvailable: true,
  
  // Right to opt-out of sales
  dataSalesOptOut: 'https://budgettool.com/opt-out',
  
  // California rights notice
  privacyNotice: 'https://budgettool.com/ccpa-notice',
}

// Disclosure of data sales
export async function disclosureOfDataSales(userId: string) {
  // Budget Tool doesn't sell user data, so return empty
  return {
    dataSold: false,
    categories: [],
    recipients: [],
  };
}

// Opt-out mechanism
export async function optOutOfSales(userId: string) {
  await db.users.update({
    where: { id: userId },
    data: { optOutOfSales: true },
  });
  
  return { success: true };
}
```

---

## Incident Response & Monitoring

### Audit Logging

```typescript
// Log all security-relevant events

interface AuditLog {
  id: string;
  userId: string;
  action: string; // LOGIN, LOGOUT, CREATE_ACCOUNT, DELETE_TRANSACTION, etc.
  entityType: string; // TRANSACTION, CATEGORY, USER, etc.
  entityId: string;
  changes: {
    before: any;
    after: any;
  };
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export async function auditLog(event: Omit<AuditLog, 'id' | 'timestamp'>) {
  // Store in database
  await db.auditLogs.create({
    data: {
      ...event,
      timestamp: new Date(),
    },
  });
  
  // Alert on critical events
  if (event.severity === 'critical') {
    await sendSecurityAlert({
      subject: `Security Alert: ${event.action}`,
      recipient: 'security@budgettool.com',
      details: event,
    });
  }
  
  // Log to file for compliance
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'AUDIT',
    ...event,
  }));
}

// Example audit log entries
await auditLog({
  userId: user.id,
  action: 'USER_LOGIN',
  entityType: 'USER',
  entityId: user.id,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  severity: 'low',
});

await auditLog({
  userId: user.id,
  action: 'PASSWORD_CHANGED',
  entityType: 'USER',
  entityId: user.id,
  changes: {
    before: { passwordHash: '***' },
    after: { passwordHash: '***' },
  },
  severity: 'high',
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
});

// Query audit logs
export async function getAuditLogs(
  userId: string,
  filters?: {
    startDate?: Date;
    endDate?: Date;
    action?: string;
    severity?: string;
  }
) {
  return db.auditLogs.findMany({
    where: {
      userId,
      ...(filters?.startDate && { timestamp: { gte: filters.startDate } }),
      ...(filters?.endDate && { timestamp: { lte: filters.endDate } }),
      ...(filters?.action && { action: filters.action }),
      ...(filters?.severity && { severity: filters.severity }),
    },
    orderBy: { timestamp: 'desc' },
    take: 1000,
  });
}
```

### Monitoring & Alerting

```typescript
// Real-time security monitoring

interface SecurityAlert {
  id: string;
  type: 'BRUTE_FORCE' | 'UNUSUAL_ACTIVITY' | 'DATA_BREACH' | 'UNAUTHORIZED_ACCESS';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recipient: string;
  timestamp: Date;
  acknowledged: boolean;
}

// Brute force detection
export async function detectBruteForce(userId: string) {
  const failedAttempts = await redis.incr(`failed_login:${userId}`);
  
  if (failedAttempts === 1) {
    await redis.expire(`failed_login:${userId}`, 15 * 60); // 15 minute window
  }
  
  if (failedAttempts > 5) {
    // Trigger alert
    await sendSecurityAlert({
      type: 'BRUTE_FORCE',
      severity: 'high',
      message: `Brute force detected: ${failedAttempts} failed login attempts for ${userId}`,
      recipient: 'security@budgettool.com',
    });
    
    // Lock account
    await db.users.update({
      where: { id: userId },
      data: { isLockedOut: true, lockedOutUntil: new Date(Date.now() + 60 * 60 * 1000) },
    });
  }
}

// Unusual activity detection
export async function detectUnusualActivity(userId: string, activity: any) {
  const userProfile = await redis.get(`user_profile:${userId}`);
  
  if (!userProfile) {
    // Build profile on first activity
    await redis.setex(
      `user_profile:${userId}`,
      30 * 24 * 60 * 60,
      JSON.stringify({
        commonLocations: [activity.location],
        commonTimes: [new Date().getHours()],
      })
    );
    return;
  }
  
  const profile = JSON.parse(userProfile);
  
  // Check for unusual location
  if (!profile.commonLocations.includes(activity.location)) {
    await sendSecurityAlert({
      type: 'UNUSUAL_ACTIVITY',
      severity: 'medium',
      message: `Unusual login from ${activity.location}. Is this you?`,
      recipient: `user_${userId}@budgettool.com`,
    });
  }
}

// Exponential backoff for alerts (prevent alert fatigue)
export async function sendSecurityAlert(alert: SecurityAlert) {
  const cacheKey = `alert_sent:${alert.type}:${alert.recipient}`;
  const sent = await redis.get(cacheKey);
  
  if (sent) {
    console.log('Alert recently sent, skipping');
    return;
  }
  
  // Send email
  await emailService.sendSecurityAlert(alert.recipient, alert);
  
  // Cache to prevent duplicate alerts
  const backoffSeconds = Math.min(300, 60 * Math.pow(2, alert.severity === 'critical' ? 0 : 1));
  await redis.setex(cacheKey, backoffSeconds, 'true');
}
```

### Security Monitoring Dashboard

```typescript
// Metrics for security monitoring

export async function getSecurityMetrics(timeframe: 'hour' | 'day' | 'week') {
  const cutoff = new Date();
  
  switch (timeframe) {
    case 'hour':
      cutoff.setHours(cutoff.getHours() - 1);
      break;
    case 'day':
      cutoff.setDate(cutoff.getDate() - 1);
      break;
    case 'week':
      cutoff.setDate(cutoff.getDate() - 7);
      break;
  }
  
  return {
    loginAttempts: await db.auditLogs.count({
      where: {
        action: 'USER_LOGIN',
        timestamp: { gte: cutoff },
      },
    }),
    failedLogins: await db.auditLogs.count({
      where: {
        action: 'LOGIN_FAILED',
        timestamp: { gte: cutoff },
      },
    }),
    passwordResets: await db.auditLogs.count({
      where: {
        action: 'PASSWORD_RESET',
        timestamp: { gte: cutoff },
      },
    }),
    dataAccess: await db.auditLogs.count({
      where: {
        action: { in: ['TRANSACTION_READ', 'ACCOUNT_READ'] },
        timestamp: { gte: cutoff },
      },
    }),
    unauthorizedAttempts: await db.auditLogs.count({
      where: {
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        timestamp: { gte: cutoff },
      },
    }),
    criticalAlerts: await db.securityAlerts.count({
      where: {
        severity: 'critical',
        timestamp: { gte: cutoff },
      },
    }),
  };
}
```

---

## Security Checklist

### Development

- [ ] Password validation: Minimum 12 characters, mixed case, numbers, symbols
- [ ] Password hashing: bcrypt with cost factor 12+
- [ ] JWT implementation: Short-lived tokens (15 min), refresh tokens (7 days)
- [ ] httpOnly cookies: Set on all auth tokens
- [ ] CSRF protection: Token validation on state-changing requests
- [ ] XSS prevention: Content Security Policy headers, input sanitization
- [ ] SQL injection prevention: Parameterized queries via Prisma
- [ ] Email verification: 24-hour expiration, rate limiting
- [ ] Password reset: 1-hour expiration, token hashing, session invalidation
- [ ] Rate limiting: 100 req/min per user, 5 auth attempts per 15 min
- [ ] Input validation: Zod schemas on all endpoints
- [ ] Output encoding: React auto-escaping enabled
- [ ] Error handling: Don't expose sensitive info in errors
- [ ] Logging: Security events logged with user context

### Data & Encryption

- [ ] Field encryption: AES-256-GCM for sensitive data
- [ ] Encryption keys: Stored in environment, rotated regularly
- [ ] Plaid tokens: Encrypted, refreshed before expiration
- [ ] Database: Encrypted volumes, strong password, network isolation
- [ ] Backups: Encrypted, daily, tested restoration
- [ ] Data retention: Old data purged per policy (7 years)
- [ ] Data deletion: Complete cascade delete on user deletion

### Infrastructure

- [ ] HTTPS/TLS 1.3: All traffic encrypted
- [ ] Certificate management: Let's Encrypt, auto-renewal
- [ ] Security headers: HSTS, CSP, X-Frame-Options, etc.
- [ ] Firewall: UFW with restrictive default policies
- [ ] SSH: Key-only auth, root login disabled
- [ ] Docker: Non-root containers, security opts, resource limits
- [ ] Secrets management: Environment variables, not in code
- [ ] OS hardening: SELinux/AppArmor, fail2ban, security updates

### API Security

- [ ] API keys: Hashed, rate limited, permission-based
- [ ] CORS: Only allow trusted origins
- [ ] Rate limiting: Per-user and per-IP limits
- [ ] Auth middleware: On all protected endpoints
- [ ] Audit logging: All API access logged
- [ ] Monitoring: Real-time alerts for suspicious activity

### Compliance

- [ ] Privacy policy: Current and accessible
- [ ] GDPR: Data export, deletion, consent tracking
- [ ] CCPA: Data sales disclosure, opt-out mechanism
- [ ] PCI DSS: Encryption, access control, testing
- [ ] Audit logs: Retention per regulatory requirements
- [ ] Data processing agreement: If using third-party services

### Testing

- [ ] Penetration testing: Annual or after major changes
- [ ] Vulnerability scanning: Monthly
- [ ] Security code review: Before production deployment
- [ ] Dependency scanning: Regular updates, security patches
- [ ] SSL certificate: Valid, not expired, proper configuration
- [ ] Rate limiting: Test with multiple requests
- [ ] CSRF: Verify token validation
- [ ] XSS: Test with malicious input
- [ ] SQL injection: Test with SQL payloads

### Incident Response

- [ ] Incident response plan: Documented and tested
- [ ] Contact list: Security team, legal, customers
- [ ] Notification process: Timely customer communication
- [ ] Forensics: Log retention for investigation
- [ ] Recovery procedures: Restore from backups
- [ ] Post-incident review: Document lessons learned

---

## References & Resources

### Security Standards
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- CWE/SANS Top 25: https://cwe.mitre.org/top25/

### Authentication
- JWT Best Practices: https://tools.ietf.org/html/rfc8725
- OWASP Session Management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- bcrypt Overview: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

### Encryption
- OWASP Cryptographic Storage: https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
- AES Encryption: https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.197.pdf

### Web Application Security
- OWASP API Security: https://owasp.org/www-project-api-security/
- Content Security Policy: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP

### Compliance
- GDPR: https://gdpr-info.eu/
- CCPA: https://oag.ca.gov/privacy/ccpa
- PCI DSS: https://www.pcisecuritystandards.org/

### Tools
- OWASP ZAP: Free security testing tool
- npm audit: Dependency vulnerability scanning
- Snyk: Continuous security monitoring
- HaveIBeenPwned: Check for breached passwords

---

**Last Updated:** July 16, 2026
**Next Review:** January 16, 2027
**Owner:** Security Team
**Status:** Active
