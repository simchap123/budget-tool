# Budget Tool API Specification

## Overview

Complete REST API specification for the personal finance platform. This document describes all endpoints, request/response formats, error handling, and integration points.

**Base URL:** `https://api.budgettool.dev/api` (production) or `http://localhost:8090/api` (development)

**API Version:** v1

**Authentication:** JWT tokens in httpOnly cookies (recommended) or `Authorization: Bearer {token}` header

---

## Table of Contents

1. [Authentication](#authentication-endpoints)
2. [Account Management](#account-management)
3. [Transactions](#transaction-operations)
4. [Categories](#category-management)
5. [Budgets](#budget-endpoints)
6. [Reporting](#reporting-endpoints)
7. [Plaid Integration](#plaid-integration-endpoints)
8. [File Operations](#file-upload-endpoints)
9. [Error Handling](#error-codes-and-status-codes)
10. [Rate Limiting & Pagination](#rate-limiting--pagination)

---

## Authentication Endpoints

### POST /auth/register

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "currency": "USD",
  "timezone": "America/New_York"
}
```

**Response:** `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "currency": "USD",
  "timezone": "America/New_York",
  "emailVerified": false,
  "onboardingCompleted": false,
  "createdAt": "2024-07-16T10:00:00Z",
  "updatedAt": "2024-07-16T10:00:00Z",
  "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "authRefresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request` - Invalid email format, weak password, or missing fields
- `409 Conflict` - Email already registered
- `422 Unprocessable Entity` - Validation error (see error details)

**Validation Rules:**
- Email must be valid RFC 5322 format
- Password minimum 8 characters (recommend 12+)
- Name minimum 2 characters, maximum 255
- Currency must be valid ISO 4217 code (USD, EUR, GBP, etc.)
- Timezone must be valid IANA timezone

---

### POST /auth/login

Authenticate user and obtain JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "currency": "USD",
  "timezone": "America/New_York",
  "emailVerified": true,
  "lastLoginAt": "2024-07-16T10:00:00Z",
  "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "authRefresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid email or password
- `429 Too Many Requests` - Too many login attempts (rate limited)
- `400 Bad Request` - Missing required fields

**Security Notes:**
- Token expires in 24 hours
- Refresh token expires in 7 days
- Set `httpOnly` and `Secure` flags on cookies
- Lock account after 5 failed attempts for 15 minutes

---

### POST /auth/refresh

Obtain new access token using refresh token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`
```json
{
  "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "authRefresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or expired refresh token
- `400 Bad Request` - Missing refresh token

---

### POST /auth/logout

Invalidate current session and tokens.

**Request:** (No body required, uses Authorization header)

**Response:** `200 OK`
```json
{
  "message": "Successfully logged out"
}
```

**Side Effects:**
- Invalidates current session
- Refresh token blacklisted
- Client should clear cookies

---

### POST /auth/password-reset-request

Request password reset via email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password reset email sent if account exists",
  "expiresIn": 3600
}
```

**Notes:**
- Always returns 200 for security (doesn't reveal if email exists)
- Reset link valid for 1 hour
- Reset token sent via email (use Resend/SendGrid)
- Contains unique token in URL: `/reset?token={token}`

---

### POST /auth/password-reset

Complete password reset with token.

**Request:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePassword123!"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password successfully reset",
  "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400 Bad Request` - Invalid or expired token
- `422 Unprocessable Entity` - Password too weak or token missing

---

### POST /auth/verify-email

Verify email address with token.

**Request:**
```json
{
  "token": "email_verification_token"
}
```

**Response:** `200 OK`
```json
{
  "message": "Email verified successfully",
  "emailVerified": true
}
```

**Error Responses:**
- `400 Bad Request` - Invalid or expired token

---

### POST /auth/resend-verification

Request new email verification token.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "message": "Verification email sent"
}
```

---

## Account Management

### GET /users/me

Get current authenticated user profile.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar": "https://api.budgettool.dev/files/avatars/user123.jpg",
  "currency": "USD",
  "timezone": "America/New_York",
  "theme": "dark",
  "emailVerified": true,
  "onboardingCompleted": true,
  "lastLoginAt": "2024-07-16T10:00:00Z",
  "createdAt": "2024-07-16T10:00:00Z",
  "updatedAt": "2024-07-16T10:00:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - User not found

---

### PATCH /users/me

Update current user profile.

**Request:**
```json
{
  "name": "Jane Doe",
  "currency": "EUR",
  "timezone": "Europe/London",
  "theme": "light",
  "avatar": "https://example.com/avatar.jpg"
}
```

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Jane Doe",
  "currency": "EUR",
  "timezone": "Europe/London",
  "theme": "light",
  "avatar": "https://example.com/avatar.jpg",
  "updatedAt": "2024-07-16T11:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid field values
- `401 Unauthorized` - Not authenticated
- `409 Conflict` - Email already taken (if updating email)

---

### PATCH /users/me/password

Change password (requires current password).

**Request:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword456!"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Current password incorrect or new password too weak
- `401 Unauthorized` - Not authenticated

---

### DELETE /users/me

Delete user account and all associated data (permanent).

**Request:**
```json
{
  "password": "YourPassword123!",
  "confirmation": "DELETE MY ACCOUNT"
}
```

**Response:** `204 No Content`

**Side Effects:**
- Deletes user, all accounts, transactions, categories, budgets
- Disconnects all Plaid accounts
- Data cannot be recovered
- Confirmation string must match exactly

**Error Responses:**
- `400 Bad Request` - Invalid password or confirmation string
- `401 Unauthorized` - Not authenticated

---

### GET /accounts

List all bank accounts for current user.

**Query Parameters:**
```
?page=1&perPage=50&sort=-createdAt&isActive=true
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "account-uuid-1",
      "name": "Checking Account",
      "accountType": "checking",
      "institutionName": "Chase Bank",
      "accountNumber": "****1234",
      "currentBalance": 5000.00,
      "isActive": true,
      "isClosed": false,
      "lastSyncAt": "2024-07-16T10:00:00Z",
      "createdAt": "2024-07-01T10:00:00Z",
      "updatedAt": "2024-07-16T10:00:00Z"
    }
  ],
  "page": 1,
  "perPage": 50,
  "totalItems": 1,
  "totalPages": 1
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated

---

### POST /accounts

Create a new manual bank account (non-Plaid).

**Request:**
```json
{
  "name": "Savings Account",
  "accountType": "savings",
  "institutionName": "Chase Bank",
  "accountNumber": "****5678",
  "currentBalance": 10000.00,
  "currency": "USD"
}
```

**Response:** `201 Created`
```json
{
  "id": "account-uuid-2",
  "name": "Savings Account",
  "accountType": "savings",
  "institutionName": "Chase Bank",
  "accountNumber": "****5678",
  "currentBalance": 10000.00,
  "isActive": true,
  "createdAt": "2024-07-16T10:00:00Z",
  "updatedAt": "2024-07-16T10:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid account type or duplicate name
- `401 Unauthorized` - Not authenticated
- `422 Unprocessable Entity` - Validation error

---

### GET /accounts/{id}

Get specific account details.

**Response:** `200 OK`
```json
{
  "id": "account-uuid-1",
  "name": "Checking Account",
  "accountType": "checking",
  "institutionName": "Chase Bank",
  "accountNumber": "****1234",
  "currentBalance": 5000.00,
  "lastSyncAt": "2024-07-16T10:00:00Z",
  "isActive": true,
  "isClosed": false,
  "createdAt": "2024-07-01T10:00:00Z",
  "updatedAt": "2024-07-16T10:00:00Z",
  "transactionCount": 156,
  "statementCount": 2
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Account not found
- `403 Forbidden` - Account belongs to different user

---

### PATCH /accounts/{id}

Update account details.

**Request:**
```json
{
  "name": "Chase Checking",
  "currentBalance": 5250.00,
  "isActive": true
}
```

**Response:** `200 OK`
```json
{
  "id": "account-uuid-1",
  "name": "Chase Checking",
  "currentBalance": 5250.00,
  "updatedAt": "2024-07-16T11:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid balance or duplicate name
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Account not found

---

### DELETE /accounts/{id}

Delete a bank account and all associated transactions.

**Request:**
```json
{
  "confirmation": true
}
```

**Response:** `204 No Content`

**Side Effects:**
- Deletes account and all linked transactions
- If Plaid-connected, disconnects from Plaid
- Data cannot be recovered

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Account not found

---

### POST /accounts/{id}/sync

Manually sync account (for Plaid or CSV accounts).

**Request:** (No body required)

**Response:** `200 OK`
```json
{
  "id": "account-uuid-1",
  "status": "syncing",
  "syncStartedAt": "2024-07-16T11:05:00Z",
  "message": "Account sync in progress"
}
```

**Polling Response:** (Check after 5-10 seconds)
```json
{
  "id": "account-uuid-1",
  "status": "completed",
  "transactionsAdded": 23,
  "transactionsDuplicated": 2,
  "lastSyncAt": "2024-07-16T11:05:30Z",
  "nextSyncAt": "2024-07-17T11:05:30Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Account not found
- `409 Conflict` - Sync already in progress
- `503 Service Unavailable` - Plaid API temporarily unavailable

---

### GET /accounts/{id}/balance-history

Get account balance history over time.

**Query Parameters:**
```
?from=2024-01-01&to=2024-07-16&granularity=daily
```

**Response:** `200 OK`
```json
{
  "accountId": "account-uuid-1",
  "granularity": "daily",
  "history": [
    {
      "date": "2024-07-01",
      "balance": 4800.00,
      "change": -200.00
    },
    {
      "date": "2024-07-16",
      "balance": 5000.00,
      "change": 200.00
    }
  ]
}
```

---

## Transaction Operations

### GET /transactions

List transactions with advanced filtering and search.

**Query Parameters:**
```
?page=1
&perPage=50
&sort=-transactionDate
&from=2024-01-01
&to=2024-07-16
&accountId={id}
&categoryId={id}
&minAmount=0
&maxAmount=10000
&type=expense
&search=grocery
&tags=food,weekly
&isReconciled=false
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "txn-uuid-1",
      "accountId": "account-uuid-1",
      "description": "Whole Foods Market",
      "amount": 125.45,
      "type": "expense",
      "transactionDate": "2024-07-16",
      "postedDate": "2024-07-17",
      "merchant": "Whole Foods Market",
      "category": {
        "id": "cat-uuid-1",
        "name": "Groceries"
      },
      "subcategory": {
        "id": "subcat-uuid-1",
        "name": "Supermarket"
      },
      "tags": ["food", "weekly"],
      "notes": "Weekly grocery shopping",
      "source": "plaid",
      "isReconciled": false,
      "isDuplicate": false,
      "createdAt": "2024-07-16T10:00:00Z",
      "updatedAt": "2024-07-16T10:00:00Z"
    }
  ],
  "page": 1,
  "perPage": 50,
  "totalItems": 234,
  "totalPages": 5,
  "summary": {
    "totalIncome": 5000.00,
    "totalExpense": 2350.00,
    "netFlow": 2650.00
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid date format or filters
- `401 Unauthorized` - Not authenticated

**Search Examples:**
- `search=Walmart` - Search in merchant and description
- `search="exact phrase"` - Exact phrase match
- Full-text search supported on merchant and description

---

### POST /transactions

Create a single manual transaction.

**Request:**
```json
{
  "accountId": "account-uuid-1",
  "description": "Coffee shop",
  "amount": 5.50,
  "type": "expense",
  "transactionDate": "2024-07-16",
  "merchant": "Starbucks",
  "categoryId": "cat-uuid-2",
  "subcategoryId": "subcat-uuid-2",
  "tags": ["coffee", "daily"],
  "notes": "Morning coffee"
}
```

**Response:** `201 Created`
```json
{
  "id": "txn-uuid-2",
  "accountId": "account-uuid-1",
  "description": "Coffee shop",
  "amount": 5.50,
  "type": "expense",
  "transactionDate": "2024-07-16",
  "merchant": "Starbucks",
  "category": {
    "id": "cat-uuid-2",
    "name": "Dining Out"
  },
  "tags": ["coffee", "daily"],
  "source": "manual",
  "isReconciled": false,
  "createdAt": "2024-07-16T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid amount or missing required fields
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Account or category not found
- `422 Unprocessable Entity` - Validation error

---

### GET /transactions/{id}

Get transaction details.

**Response:** `200 OK`
```json
{
  "id": "txn-uuid-1",
  "accountId": "account-uuid-1",
  "description": "Whole Foods Market",
  "amount": 125.45,
  "type": "expense",
  "transactionDate": "2024-07-16",
  "postedDate": "2024-07-17",
  "merchant": "Whole Foods Market",
  "category": {
    "id": "cat-uuid-1",
    "name": "Groceries"
  },
  "subcategory": {
    "id": "subcat-uuid-1",
    "name": "Supermarket"
  },
  "tags": ["food", "weekly"],
  "notes": "Weekly grocery shopping",
  "source": "plaid",
  "sourceId": "plaid-txn-12345",
  "isReconciled": true,
  "reconcileDate": "2024-07-17T14:00:00Z",
  "isDuplicate": false,
  "createdAt": "2024-07-16T10:00:00Z",
  "updatedAt": "2024-07-16T10:00:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Transaction not found

---

### PATCH /transactions/{id}

Update transaction details.

**Request:**
```json
{
  "description": "Whole Foods - Weekly Shop",
  "categoryId": "cat-uuid-1",
  "subcategoryId": "subcat-uuid-1",
  "tags": ["groceries", "weekly"],
  "notes": "Weekly grocery shopping updated",
  "isReconciled": true
}
```

**Response:** `200 OK`
```json
{
  "id": "txn-uuid-1",
  "description": "Whole Foods - Weekly Shop",
  "category": {
    "id": "cat-uuid-1",
    "name": "Groceries"
  },
  "tags": ["groceries", "weekly"],
  "isReconciled": true,
  "reconcileDate": "2024-07-16T12:00:00Z",
  "updatedAt": "2024-07-16T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid category or fields
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Transaction not found

---

### DELETE /transactions/{id}

Delete a single transaction.

**Response:** `204 No Content`

**Side Effects:**
- Transaction permanently deleted
- Cannot be recovered (audit log retained)

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Transaction not found

---

### POST /transactions/batch-import

Import multiple transactions from CSV or JSON.

**Request (Multipart Form Data):**
```
POST /transactions/batch-import
Content-Type: multipart/form-data

file: [CSV file]
accountId: {account-uuid}
duplicateHandling: skip|replace|prompt
format: csv|json
```

**CSV Format Example:**
```
Date,Description,Amount,Merchant,Type,Category
2024-07-16,Whole Foods,125.45,Whole Foods Market,expense,Groceries
2024-07-15,Salary Deposit,3500.00,Employer Inc,income,Salary
```

**Response:** `202 Accepted`
```json
{
  "importId": "import-uuid-123",
  "status": "processing",
  "fileName": "transactions.csv",
  "fileSize": 2048,
  "rowCount": 50,
  "estimatedDuration": 15,
  "statusUrl": "/imports/import-uuid-123",
  "message": "Import queued for processing"
}
```

**Polling Status Response:**
```json
{
  "importId": "import-uuid-123",
  "status": "completed",
  "fileName": "transactions.csv",
  "rowCount": 50,
  "importedCount": 48,
  "duplicateCount": 2,
  "errorCount": 0,
  "errors": [],
  "completedAt": "2024-07-16T12:10:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid CSV format or missing account
- `401 Unauthorized` - Not authenticated
- `413 Payload Too Large` - File larger than 10MB
- `415 Unsupported Media Type` - Unsupported file format

**CSV Column Support:**
- `Date` (required) - YYYY-MM-DD format
- `Description` (required) - Transaction description
- `Amount` (required) - Positive number
- `Merchant` (optional)
- `Type` (optional) - income, expense, transfer
- `Category` (optional) - Category name
- `Notes` (optional)
- `Tags` (optional) - Comma-separated

---

### GET /transactions/batch-import/{importId}

Check status of a batch import.

**Response:** `200 OK`
```json
{
  "importId": "import-uuid-123",
  "status": "completed",
  "fileName": "transactions.csv",
  "fileSize": 2048,
  "rowCount": 50,
  "importedCount": 48,
  "duplicateCount": 2,
  "errorCount": 0,
  "errors": [
    {
      "row": 15,
      "error": "Invalid date format",
      "data": "15/07/2024,Purchase,100.00"
    }
  ],
  "completedAt": "2024-07-16T12:10:00Z",
  "summary": {
    "totalAmount": 3250.00,
    "avgAmount": 67.71,
    "categorized": 48,
    "uncategorized": 0
  }
}
```

---

### POST /transactions/search

Advanced transaction search.

**Request:**
```json
{
  "query": "grocery",
  "filters": {
    "dateFrom": "2024-01-01",
    "dateTo": "2024-07-16",
    "minAmount": 0,
    "maxAmount": 500,
    "type": "expense",
    "categories": ["cat-uuid-1", "cat-uuid-2"],
    "merchants": ["Whole Foods", "Safeway"],
    "tags": ["food"],
    "isReconciled": false
  },
  "page": 1,
  "perPage": 50,
  "sort": "-transactionDate"
}
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "txn-uuid-1",
      "description": "Whole Foods Market",
      "amount": 125.45,
      "transactionDate": "2024-07-16",
      "category": "Groceries",
      "merchant": "Whole Foods Market"
    }
  ],
  "page": 1,
  "perPage": 50,
  "totalItems": 24,
  "totalPages": 1,
  "queryTime": 145,
  "summary": {
    "totalAmount": 2540.90,
    "count": 24,
    "avgAmount": 105.87
  }
}
```

---

### POST /transactions/split

Split a single transaction into multiple transactions.

**Request:**
```json
{
  "transactionId": "txn-uuid-1",
  "splits": [
    {
      "amount": 75.00,
      "categoryId": "cat-uuid-1",
      "description": "Groceries"
    },
    {
      "amount": 50.45,
      "categoryId": "cat-uuid-2",
      "description": "Household items"
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "parentTransactionId": "txn-uuid-1",
  "splits": [
    {
      "id": "txn-split-1",
      "amount": 75.00,
      "category": "Groceries"
    },
    {
      "id": "txn-split-2",
      "amount": 50.45,
      "category": "Household items"
    }
  ],
  "message": "Transaction split successfully"
}
```

---

### POST /transactions/merge

Merge duplicate transactions into one.

**Request:**
```json
{
  "primaryTransactionId": "txn-uuid-1",
  "duplicateTransactionIds": ["txn-uuid-2", "txn-uuid-3"]
}
```

**Response:** `200 OK`
```json
{
  "primaryTransactionId": "txn-uuid-1",
  "mergedCount": 2,
  "message": "Transactions merged successfully"
}
```

---

## Category Management

### GET /categories

List all spending categories for user.

**Query Parameters:**
```
?page=1&perPage=100&sort=displayOrder&isActive=true&isCustom=null
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "cat-uuid-1",
      "name": "Groceries",
      "description": "Food and grocery shopping",
      "color": "#FF6B6B",
      "icon": "shopping-bag",
      "tier": "tier_2",
      "isDefault": true,
      "isActive": true,
      "isCustom": false,
      "displayOrder": 1,
      "subcategories": [
        {
          "id": "subcat-uuid-1",
          "name": "Supermarket",
          "displayOrder": 1
        }
      ],
      "createdAt": "2024-07-01T10:00:00Z"
    }
  ],
  "page": 1,
  "perPage": 100,
  "totalItems": 23,
  "totalPages": 1
}
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated

---

### POST /categories

Create a new custom category.

**Request:**
```json
{
  "name": "Pet Supplies",
  "description": "Pet food and supplies",
  "color": "#FFA500",
  "icon": "paw-print",
  "parentCategoryId": null
}
```

**Response:** `201 Created`
```json
{
  "id": "cat-uuid-24",
  "name": "Pet Supplies",
  "description": "Pet food and supplies",
  "color": "#FFA500",
  "icon": "paw-print",
  "isCustom": true,
  "isActive": true,
  "displayOrder": 24,
  "createdAt": "2024-07-16T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid color format or duplicate name
- `401 Unauthorized` - Not authenticated
- `409 Conflict` - Category name already exists

---

### GET /categories/{id}

Get category details with spending summary.

**Response:** `200 OK`
```json
{
  "id": "cat-uuid-1",
  "name": "Groceries",
  "description": "Food and grocery shopping",
  "color": "#FF6B6B",
  "icon": "shopping-bag",
  "isCustom": false,
  "isActive": true,
  "subcategories": [
    {
      "id": "subcat-uuid-1",
      "name": "Supermarket"
    }
  ],
  "stats": {
    "totalSpent": 1250.50,
    "averageTransaction": 62.53,
    "transactionCount": 20,
    "lastTransaction": "2024-07-16T10:00:00Z"
  }
}
```

---

### PATCH /categories/{id}

Update category.

**Request:**
```json
{
  "name": "Groceries & Dining",
  "description": "Food purchases",
  "color": "#FF6B6B",
  "icon": "utensils",
  "isActive": true
}
```

**Response:** `200 OK`
```json
{
  "id": "cat-uuid-1",
  "name": "Groceries & Dining",
  "color": "#FF6B6B",
  "updatedAt": "2024-07-16T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Cannot modify default category
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Category not found
- `409 Conflict` - Category name already exists

---

### DELETE /categories/{id}

Delete custom category (cannot delete default categories).

**Request:**
```json
{
  "replacementCategoryId": "cat-uuid-default"
}
```

**Response:** `204 No Content`

**Side Effects:**
- Transactions reassigned to replacement category
- Category and rules deleted

**Error Responses:**
- `400 Bad Request` - Cannot delete default category
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Category not found

---

### POST /categories/{id}/rules

Create categorization rule for category.

**Request:**
```json
{
  "name": "Amazon purchases",
  "description": "Auto-categorize Amazon purchases",
  "pattern": "amazon|AMZN",
  "matchType": "regex",
  "searchField": "merchant",
  "subcategoryId": "subcat-uuid-1",
  "autoApply": true,
  "priority": 10
}
```

**Response:** `201 Created`
```json
{
  "id": "rule-uuid-1",
  "categoryId": "cat-uuid-1",
  "name": "Amazon purchases",
  "pattern": "amazon|AMZN",
  "matchType": "regex",
  "subcategoryId": "subcat-uuid-1",
  "autoApply": true,
  "priority": 10,
  "isActive": true,
  "createdAt": "2024-07-16T12:00:00Z"
}
```

**Match Types:**
- `contains` - Case-insensitive substring match
- `equals` - Exact match
- `regex` - Regular expression
- `startsWith` - String starts with pattern
- `endsWith` - String ends with pattern

---

### GET /categories/{id}/rules

List rules for category.

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "rule-uuid-1",
      "name": "Amazon purchases",
      "pattern": "amazon|AMZN",
      "matchType": "regex",
      "autoApply": true,
      "priority": 10,
      "isActive": true,
      "matchCount": 45,
      "lastMatchedAt": "2024-07-16T10:00:00Z"
    }
  ]
}
```

---

### DELETE /categories/{id}/rules/{ruleId}

Delete categorization rule.

**Response:** `204 No Content`

---

### POST /categories/auto-categorize

Apply AI-based auto-categorization to uncategorized transactions.

**Request:**
```json
{
  "dateFrom": "2024-01-01",
  "dateTo": "2024-07-16",
  "uncategorizedOnly": true,
  "confidenceThreshold": 0.7
}
```

**Response:** `202 Accepted`
```json
{
  "jobId": "auto-cat-job-123",
  "status": "processing",
  "estimatedDuration": 30,
  "statusUrl": "/categories/auto-categorize/auto-cat-job-123"
}
```

**Job Status Response:**
```json
{
  "jobId": "auto-cat-job-123",
  "status": "completed",
  "transactionCount": 156,
  "categorizedCount": 142,
  "skippedCount": 14,
  "confidenceStats": {
    "high": 142,
    "medium": 0,
    "low": 14
  },
  "completedAt": "2024-07-16T12:10:00Z"
}
```

---

## Budget Endpoints

### GET /budgets

List all budgets for user.

**Query Parameters:**
```
?year=2024&month=7&categoryId={id}&isActive=true
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "budget-uuid-1",
      "name": "July 2024 Groceries",
      "description": "Weekly grocery budget",
      "year": 2024,
      "month": 7,
      "category": {
        "id": "cat-uuid-1",
        "name": "Groceries"
      },
      "budgetAmount": 500.00,
      "spent": 425.50,
      "spentPercentage": 85.1,
      "remaining": 74.50,
      "alertThreshold": 0.80,
      "isAlerted": false,
      "isActive": true,
      "createdAt": "2024-07-01T10:00:00Z"
    }
  ],
  "summary": {
    "totalBudgeted": 2500.00,
    "totalSpent": 1850.25,
    "totalRemaining": 649.75,
    "spentPercentage": 74.01
  }
}
```

---

### POST /budgets

Create a new budget.

**Request:**
```json
{
  "name": "August 2024 Dining",
  "description": "Monthly dining out budget",
  "categoryId": "cat-uuid-3",
  "year": 2024,
  "month": 8,
  "budgetAmount": 300.00,
  "alertThreshold": 0.75,
  "isActive": true
}
```

**Response:** `201 Created`
```json
{
  "id": "budget-uuid-2",
  "name": "August 2024 Dining",
  "categoryId": "cat-uuid-3",
  "year": 2024,
  "month": 8,
  "budgetAmount": 300.00,
  "alertThreshold": 0.75,
  "spent": 0.00,
  "spentPercentage": 0,
  "remaining": 300.00,
  "isActive": true,
  "createdAt": "2024-07-16T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid category or amount
- `401 Unauthorized` - Not authenticated
- `409 Conflict` - Budget already exists for period/category

---

### GET /budgets/{id}

Get budget details with transaction breakdown.

**Response:** `200 OK`
```json
{
  "id": "budget-uuid-1",
  "name": "July 2024 Groceries",
  "categoryId": "cat-uuid-1",
  "year": 2024,
  "month": 7,
  "budgetAmount": 500.00,
  "spent": 425.50,
  "spentPercentage": 85.1,
  "remaining": 74.50,
  "alertThreshold": 0.80,
  "isAlerted": false,
  "isActive": true,
  "transactions": [
    {
      "id": "txn-uuid-1",
      "description": "Whole Foods Market",
      "amount": 125.45,
      "transactionDate": "2024-07-16"
    }
  ],
  "spendingByWeek": [
    {
      "week": 1,
      "amount": 150.00
    },
    {
      "week": 2,
      "amount": 125.50
    },
    {
      "week": 3,
      "amount": 150.00
    }
  ],
  "createdAt": "2024-07-01T10:00:00Z"
}
```

---

### PATCH /budgets/{id}

Update budget.

**Request:**
```json
{
  "budgetAmount": 550.00,
  "alertThreshold": 0.85,
  "isActive": false
}
```

**Response:** `200 OK`
```json
{
  "id": "budget-uuid-1",
  "budgetAmount": 550.00,
  "alertThreshold": 0.85,
  "updatedAt": "2024-07-16T12:00:00Z"
}
```

---

### DELETE /budgets/{id}

Delete a budget.

**Response:** `204 No Content`

---

### GET /budgets/{id}/alerts

Get all alerts for a budget.

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "alert-uuid-1",
      "budgetId": "budget-uuid-1",
      "type": "threshold_exceeded",
      "severity": "warning",
      "message": "Budget spending has reached 85% threshold",
      "spentPercentage": 85.1,
      "triggeredAt": "2024-07-16T10:00:00Z",
      "acknowledgedAt": null
    }
  ]
}
```

---

### POST /budgets/{id}/alerts/{alertId}/acknowledge

Mark budget alert as acknowledged.

**Response:** `200 OK`
```json
{
  "id": "alert-uuid-1",
  "acknowledged": true,
  "acknowledgedAt": "2024-07-16T12:00:00Z"
}
```

---

## Reporting Endpoints

### POST /reports/income-statement

Generate income statement report.

**Request:**
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-07-16",
  "groupBy": "category",
  "format": "json"
}
```

**Response:** `200 OK`
```json
{
  "reportType": "income_statement",
  "startDate": "2024-01-01",
  "endDate": "2024-07-16",
  "currency": "USD",
  "income": {
    "salary": 15000.00,
    "freelance": 2500.00,
    "other": 500.00,
    "total": 18000.00
  },
  "expenses": {
    "groceries": 450.00,
    "utilities": 300.00,
    "dining": 550.00,
    "entertainment": 200.00,
    "transportation": 400.00,
    "shopping": 800.00,
    "other": 300.00,
    "total": 3600.00
  },
  "netIncome": 14400.00,
  "summary": {
    "savingsRate": 0.8,
    "expenseRatio": 0.2
  }
}
```

---

### POST /reports/cash-flow

Generate cash flow statement.

**Request:**
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-07-16",
  "groupBy": "month",
  "format": "json"
}
```

**Response:** `200 OK`
```json
{
  "reportType": "cash_flow",
  "startDate": "2024-01-01",
  "endDate": "2024-07-16",
  "periods": [
    {
      "period": "2024-01",
      "openingBalance": 5000.00,
      "inflows": {
        "income": 2500.00,
        "transfers": 1000.00,
        "total": 3500.00
      },
      "outflows": {
        "expenses": 1200.00,
        "transfers": 800.00,
        "total": 2000.00
      },
      "netFlow": 1500.00,
      "closingBalance": 6500.00
    }
  ],
  "totalInflows": 18000.00,
  "totalOutflows": 3600.00,
  "netCashFlow": 14400.00
}
```

---

### POST /reports/budget-vs-actual

Generate budget vs actual spending report.

**Request:**
```json
{
  "year": 2024,
  "month": 7,
  "format": "json"
}
```

**Response:** `200 OK`
```json
{
  "reportType": "budget_vs_actual",
  "period": "2024-07",
  "categories": [
    {
      "id": "cat-uuid-1",
      "name": "Groceries",
      "budget": 500.00,
      "actual": 425.50,
      "variance": 74.50,
      "variancePercentage": 14.9,
      "status": "under_budget"
    },
    {
      "id": "cat-uuid-3",
      "name": "Dining",
      "budget": 300.00,
      "actual": 425.00,
      "variance": -125.00,
      "variancePercentage": -41.7,
      "status": "over_budget"
    }
  ],
  "summary": {
    "totalBudget": 2500.00,
    "totalActual": 1850.25,
    "totalVariance": 649.75,
    "variancePercentage": 26.0,
    "overBudgetCount": 2,
    "underBudgetCount": 15
  }
}
```

---

### POST /reports/category-analysis

Generate category spending analysis.

**Request:**
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-07-16",
  "topN": 10,
  "format": "json"
}
```

**Response:** `200 OK`
```json
{
  "reportType": "category_analysis",
  "startDate": "2024-01-01",
  "endDate": "2024-07-16",
  "totalSpending": 3600.00,
  "categories": [
    {
      "rank": 1,
      "name": "Shopping",
      "amount": 800.00,
      "percentage": 22.2,
      "transactionCount": 5,
      "avgTransaction": 160.00,
      "trend": "up"
    }
  ],
  "trends": {
    "mostSpentMonth": "2024-06",
    "mostSpentCategory": "Shopping",
    "averageMonthlySpending": 514.29
  }
}
```

---

### POST /reports/export

Export report in multiple formats.

**Request:**
```json
{
  "reportType": "income_statement",
  "startDate": "2024-01-01",
  "endDate": "2024-07-16",
  "format": "pdf|excel|csv|json"
}
```

**Response:** `200 OK` (PDF/Excel/CSV)
```
Binary file download
Content-Disposition: attachment; filename="income-statement-2024-01-01.pdf"
```

**Response:** `200 OK` (JSON)
```json
{
  "reportType": "income_statement",
  "data": { ... }
}
```

---

### GET /reports/recurring

List recurring/subscription expenses detected.

**Response:** `200 OK`
```json
{
  "recurring": [
    {
      "id": "recurring-uuid-1",
      "merchant": "Netflix",
      "category": "Entertainment",
      "frequency": "monthly",
      "amount": 15.99,
      "nextDueDate": "2024-08-16",
      "lastOccurrence": "2024-07-16",
      "occurrenceCount": 12,
      "confidence": 0.98
    }
  ],
  "totalMonthlyRecurring": 125.50,
  "totalAnnualRecurring": 1506.00
}
```

---

## Plaid Integration Endpoints

### POST /plaid/link-token

Get Plaid Link token for account linking flow.

**Request:**
```json
{
  "userId": "user-uuid",
  "redirectUrl": "https://budgettool.dev/accounts"
}
```

**Response:** `200 OK`
```json
{
  "linkToken": "link-sandbox-12345...",
  "expiration": "2024-07-16T14:00:00Z",
  "clientName": "Budget Tool",
  "expiresIn": 600
}
```

---

### POST /plaid/exchange-token

Exchange public token for access token and link account.

**Request:**
```json
{
  "publicToken": "public-sandbox-12345...",
  "accountId": "account-uuid",
  "accountName": "Checking Account"
}
```

**Response:** `201 Created`
```json
{
  "id": "account-uuid",
  "name": "Checking Account",
  "plaidAccountId": "BxBXxXXXXXXXXXX",
  "institutionName": "Chase",
  "accountType": "checking",
  "currentBalance": 5000.00,
  "status": "linked",
  "lastSyncAt": "2024-07-16T10:00:00Z",
  "message": "Account linked successfully"
}
```

**Side Effects:**
- Creates new account record
- Fetches initial transaction history
- Sets up automatic daily sync

**Error Responses:**
- `400 Bad Request` - Invalid public token
- `401 Unauthorized` - Not authenticated
- `409 Conflict` - Account already linked

---

### GET /plaid/accounts

List all Plaid-connected accounts.

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "account-uuid-1",
      "name": "Checking",
      "plaidAccountId": "BxBXxXXXXXXXXXX",
      "plaidInstitutionId": "ins_12345",
      "institutionName": "Chase Bank",
      "accountType": "checking",
      "currentBalance": 5000.00,
      "lastSyncAt": "2024-07-16T10:00:00Z",
      "syncStatus": "healthy",
      "lastError": null
    }
  ]
}
```

---

### POST /plaid/disconnect

Disconnect a Plaid account.

**Request:**
```json
{
  "accountId": "account-uuid"
}
```

**Response:** `200 OK`
```json
{
  "accountId": "account-uuid",
  "message": "Account disconnected from Plaid",
  "note": "Transactions remain in database"
}
```

**Side Effects:**
- Stops automatic syncing
- Retains all historical transactions
- Account can still be manually updated

---

### POST /plaid/sync

Force manual sync of Plaid account.

**Request:**
```json
{
  "accountId": "account-uuid"
}
```

**Response:** `202 Accepted`
```json
{
  "accountId": "account-uuid",
  "status": "syncing",
  "syncStartedAt": "2024-07-16T12:00:00Z"
}
```

**Polling Response:** (after 10-15 seconds)
```json
{
  "accountId": "account-uuid",
  "status": "completed",
  "transactionsAdded": 23,
  "transactionsModified": 5,
  "duplicatesFound": 2,
  "syncDuration": 15,
  "nextSyncAt": "2024-07-17T12:00:00Z"
}
```

---

### GET /plaid/sync-history

Get sync history for Plaid accounts.

**Query Parameters:**
```
?accountId={id}&limit=20
```

**Response:** `200 OK`
```json
{
  "accountId": "account-uuid",
  "syncHistory": [
    {
      "syncId": "sync-uuid-1",
      "status": "completed",
      "startedAt": "2024-07-16T12:00:00Z",
      "completedAt": "2024-07-16T12:00:15Z",
      "transactionsAdded": 23,
      "transactionsModified": 5,
      "duration": 15
    }
  ]
}
```

---

### GET /plaid/institutions

Search Plaid institutions.

**Query Parameters:**
```
?query=chase&country=US
```

**Response:** `200 OK`
```json
{
  "institutions": [
    {
      "institutionId": "ins_12345",
      "name": "Chase Bank",
      "products": ["transactions", "auth", "balance"],
      "countryCode": "US",
      "logo": "https://..."
    }
  ]
}
```

---

## File Upload Endpoints

### POST /files/upload

Upload file (CSV, PDF, receipts).

**Request (Multipart):**
```
POST /files/upload
Content-Type: multipart/form-data

file: [binary data]
type: statement|receipt|document
category: optional_category_id
```

**Response:** `201 Created`
```json
{
  "id": "file-uuid-1",
  "filename": "statement.csv",
  "fileSize": 2048,
  "fileType": "text/csv",
  "type": "statement",
  "uploadedAt": "2024-07-16T12:00:00Z",
  "downloadUrl": "https://api.budgettool.dev/files/file-uuid-1",
  "expiresAt": "2024-10-14T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid file type
- `401 Unauthorized` - Not authenticated
- `413 Payload Too Large` - File > 10MB
- `415 Unsupported Media Type` - Unsupported format

**Supported Formats:**
- CSV files for transaction import
- PDF bank statements
- Receipt images (JPG, PNG)
- Excel spreadsheets (.xlsx)

---

### GET /files/{id}

Download uploaded file.

**Response:** `200 OK`
```
Binary file download
Content-Disposition: attachment; filename="statement.csv"
Content-Type: application/octet-stream
```

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - File not found
- `410 Gone` - File expired

---

### DELETE /files/{id}

Delete uploaded file.

**Response:** `204 No Content`

---

### POST /files/export

Export transactions to file.

**Request:**
```json
{
  "format": "csv|excel|pdf",
  "filters": {
    "dateFrom": "2024-01-01",
    "dateTo": "2024-07-16",
    "categoryIds": ["cat-uuid-1"]
  }
}
```

**Response:** `200 OK` (with binary file) or `202 Accepted` for large exports

```json
{
  "id": "export-uuid-1",
  "format": "csv",
  "status": "completed",
  "downloadUrl": "https://api.budgettool.dev/files/export-uuid-1",
  "fileSize": 15360,
  "expiresAt": "2024-10-14T12:00:00Z",
  "recordCount": 256
}
```

---

## Error Codes and Status Codes

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PATCH |
| 201 | Created | Successful POST resource creation |
| 202 | Accepted | Async operation started (batch import, sync) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid request parameters or body |
| 401 | Unauthorized | Missing/invalid authentication token |
| 403 | Forbidden | Authenticated but lacking permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists or state conflict |
| 413 | Payload Too Large | Request body or file exceeds limit |
| 415 | Unsupported Media Type | Invalid Content-Type |
| 422 | Unprocessable Entity | Validation error in request data |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Server or dependency unavailable |

### Error Response Format

All errors return consistent JSON format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "statusCode": 400,
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "value": "invalid-email"
      }
    ],
    "requestId": "req-12345-67890",
    "timestamp": "2024-07-16T12:00:00Z"
  }
}
```

### Application Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| VALIDATION_ERROR | 422 | Input validation failed |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| DUPLICATE_RESOURCE | 409 | Resource already exists |
| INVALID_STATE | 409 | Operation invalid for current state |
| RATE_LIMITED | 429 | Too many requests |
| EXTERNAL_SERVICE_ERROR | 503 | Plaid/Anthropic/SendGrid error |
| INTERNAL_ERROR | 500 | Unexpected server error |
| PLAID_LINK_ERROR | 400 | Plaid linking failed |
| PLAID_SYNC_ERROR | 503 | Plaid sync failed |
| FILE_UPLOAD_ERROR | 400 | File upload failed |
| IMPORT_ERROR | 400 | CSV/file import failed |
| CATEGORIZATION_ERROR | 500 | AI categorization failed |
| DATABASE_ERROR | 500 | Database operation failed |
| INVALID_TOKEN | 401 | JWT token invalid or expired |
| ACCOUNT_LOCKED | 429 | Account locked after failed attempts |

### Example Error Responses

**Validation Error (400/422):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "statusCode": 422,
    "details": [
      {
        "field": "amount",
        "message": "Amount must be positive",
        "value": -100
      },
      {
        "field": "transactionDate",
        "message": "Date must be in YYYY-MM-DD format",
        "value": "16/07/2024"
      }
    ]
  }
}
```

**Authentication Error (401):**
```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "JWT token has expired",
    "statusCode": 401,
    "details": {
      "expiresAt": "2024-07-16T10:00:00Z"
    }
  }
}
```

**Rate Limit (429):**
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded",
    "statusCode": 429,
    "details": {
      "limit": 100,
      "window": "1 minute",
      "remaining": 0,
      "resetAt": "2024-07-16T12:01:00Z"
    }
  }
}
```

**Not Found (404):**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Transaction not found",
    "statusCode": 404,
    "details": {
      "resourceType": "transaction",
      "resourceId": "invalid-uuid"
    }
  }
}
```

---

## Rate Limiting & Pagination

### Rate Limits

**Standard Endpoints:**
- 100 requests per minute per user
- Burst: 20 requests per second

**Intensive Operations:**
- Batch import: 5 concurrent imports
- Report generation: 10 per minute
- AI categorization: 10 per minute

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1721137320
X-RateLimit-Retry-After: 45
```

**Rate Limit Response (429):**
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded",
    "statusCode": 429,
    "details": {
      "limit": 100,
      "window": "60 seconds",
      "remaining": 0,
      "resetAt": "2024-07-16T12:01:00Z",
      "retryAfter": 45
    }
  }
}
```

### Pagination

Standard pagination for list endpoints:

**Query Parameters:**
```
?page=1           # Page number (1-indexed)
&perPage=50       # Items per page (default: 50, max: 500)
&sort=-createdAt  # Sort field with direction (- for DESC)
```

**Response:**
```json
{
  "data": [ ... ],
  "page": 1,
  "perPage": 50,
  "totalItems": 234,
  "totalPages": 5,
  "hasNextPage": true,
  "hasPreviousPage": false
}
```

**Sort Examples:**
- `sort=createdAt` - Ascending
- `sort=-createdAt` - Descending
- `sort=-amount,category` - Multiple fields

**Cursor Pagination (for large datasets):**
```
?cursor=eyJpZCI6IjEyMzQ1In0&perPage=50
```

**Response:**
```json
{
  "data": [ ... ],
  "cursor": {
    "current": "eyJpZCI6IjEyMzQ1In0",
    "next": "eyJpZCI6IjEyMzQ2In0",
    "previous": "eyJpZCI6IjEyMzQ0In0"
  }
}
```

---

## Authentication & Security

### JWT Token Format

Tokens include claims:
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "iat": 1721135200,
  "exp": 1721221600,
  "type": "access"
}
```

### Token Usage

**Option 1: Authorization Header**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Option 2: httpOnly Cookie (recommended)**
```
Cookie: auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Security Headers

Required in all responses:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

### CORS

```
Access-Control-Allow-Origin: https://budgettool.dev
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Allow-Credentials: true
```

---

## Request/Response Examples

### Complete Workflow Example: New User Registration & First Account

**1. Register**
```bash
curl -X POST https://api.budgettool.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123!",
    "name": "John Doe",
    "currency": "USD",
    "timezone": "America/New_York"
  }'
```

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "name": "John Doe",
  "currency": "USD",
  "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "authRefresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**2. Create Manual Account**
```bash
curl -X POST https://api.budgettool.dev/api/accounts \
  -H "Authorization: Bearer {authToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Checking Account",
    "accountType": "checking",
    "currentBalance": 5000.00
  }'
```

Response:
```json
{
  "id": "account-uuid-1",
  "name": "Checking Account",
  "currentBalance": 5000.00,
  "createdAt": "2024-07-16T10:00:00Z"
}
```

**3. Import Transactions**
```bash
curl -X POST https://api.budgettool.dev/api/transactions/batch-import \
  -H "Authorization: Bearer {authToken}" \
  -F "file=@transactions.csv" \
  -F "accountId=account-uuid-1"
```

Response:
```json
{
  "importId": "import-uuid-123",
  "status": "processing",
  "rowCount": 50
}
```

**4. Get Report**
```bash
curl -X POST https://api.budgettool.dev/api/reports/income-statement \
  -H "Authorization: Bearer {authToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-01-01",
    "endDate": "2024-07-16",
    "format": "json"
  }'
```

Response:
```json
{
  "reportType": "income_statement",
  "income": { "total": 5000.00 },
  "expenses": { "total": 2350.00 },
  "netIncome": 2650.00
}
```

---

## API Versioning

Current version: **v1**

Version in URL path:
```
https://api.budgettool.dev/api/v1/transactions
```

Future versions will maintain backward compatibility:
```
https://api.budgettool.dev/api/v2/transactions  (with deprecation notice)
```

Deprecation policy:
- New major versions announced 6 months in advance
- Old version supported for 12 months after new release
- Clients notified via X-API-Deprecated header

---

## Webhook Events

Webhooks available for:
- Transaction created/updated
- Budget alert triggered
- Plaid sync completed
- AI categorization completed
- Account balance changed

Register webhooks at:
```
POST /webhooks
```

Example webhook payload:
```json
{
  "event": "transaction.created",
  "timestamp": "2024-07-16T12:00:00Z",
  "data": {
    "transactionId": "txn-uuid-1",
    "accountId": "account-uuid-1",
    "amount": 125.45
  }
}
```

---

## Rate Limit Examples

### Burst limit exceeded:
```
429 Too Many Requests
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1721137320
Retry-After: 45
```

### Per-minute limit examples:
- **Normal user**: 100/minute
- **Premium user**: 500/minute
- **Batch operations**: 5 concurrent

---

## Support & Documentation

- **OpenAPI/Swagger**: https://api.budgettool.dev/docs
- **Support Email**: api-support@budgettool.dev
- **Status Page**: https://status.budgettool.dev
- **GitHub Issues**: https://github.com/budgettool/api

---

## Implementation Notes

### Database Indexes
All endpoints optimized with appropriate indexes:
- `users(email)`
- `transactions(userId, transactionDate DESC)`
- `transactions(userId, categoryId, transactionDate DESC)`
- `categories(userId, name)`
- `accounts(userId, plaidAccountId)`

### Caching Strategy
- Redis cache for frequently accessed data:
  - User profile (5 min TTL)
  - Category list (10 min TTL)
  - Dashboard summary (1 min TTL)
  - Report data (30 min TTL)

### Asynchronous Operations
- Batch imports: Process in background queue
- Report generation: Queue for large datasets
- AI categorization: Background job with status polling
- Plaid sync: Scheduled job + manual trigger option

### Database Transactions
- All multi-step operations wrapped in transactions
- Automatic rollback on error
- Audit log updated for all changes

---

**API Version:** v1.0.0
**Last Updated:** July 16, 2024
**Status:** Complete Specification
