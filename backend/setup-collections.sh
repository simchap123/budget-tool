#!/bin/bash
# Set up PocketBase collections for Budget Tool

POCKETBASE_URL="http://localhost:8090"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@budget.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-changeme123!}"

echo "Setting up Budget Tool collections..."

# Wait for PocketBase to be ready
for i in {1..30}; do
  if curl -s "$POCKETBASE_URL/api/health" > /dev/null; then
    echo "PocketBase is ready"
    break
  fi
  echo "Waiting for PocketBase... ($i/30)"
  sleep 1
done

# Check if admin account already exists by trying to login
ADMIN_TOKEN=$(curl -s -X POST "$POCKETBASE_URL/api/collections/users/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  2>/dev/null | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
  echo "Admin account not found. Create one via the Admin UI at $POCKETBASE_URL/_/"
  echo "Then set ADMIN_EMAIL and ADMIN_PASSWORD environment variables and run this script again."
  exit 1
fi

echo "Admin authenticated successfully"

# Create collections using admin token
echo "Creating collections..."

# Create accounts collection
curl -s -X POST "$POCKETBASE_URL/api/collections" \
  -H "Content-Type: application/json" \
  -H "Authorization: $ADMIN_TOKEN" \
  -d '{
    "name": "accounts",
    "type": "base",
    "schema": [
      {"id": "name", "name": "name", "type": "text", "required": true},
      {"id": "bank", "name": "bank", "type": "text", "required": true},
      {"id": "accountNumber", "name": "accountNumber", "type": "text"},
      {"id": "userId", "name": "userId", "type": "relation", "collectionId": "_pb_users_auth_", "required": true}
    ]
  }' > /dev/null

# Create transactions collection
curl -s -X POST "$POCKETBASE_URL/api/collections" \
  -H "Content-Type: application/json" \
  -H "Authorization: $ADMIN_TOKEN" \
  -d '{
    "name": "transactions",
    "type": "base",
    "schema": [
      {"id": "description", "name": "description", "type": "text", "required": true},
      {"id": "amount", "name": "amount", "type": "number", "required": true},
      {"id": "type", "name": "type", "type": "select", "values": ["income", "expense"], "required": true},
      {"id": "category", "name": "category", "type": "text"},
      {"id": "date", "name": "date", "type": "date", "required": true},
      {"id": "accountId", "name": "accountId", "type": "relation", "collectionId": "accounts", "required": true},
      {"id": "userId", "name": "userId", "type": "relation", "collectionId": "_pb_users_auth_", "required": true}
    ]
  }' > /dev/null

# Create categories collection
curl -s -X POST "$POCKETBASE_URL/api/collections" \
  -H "Content-Type: application/json" \
  -H "Authorization: $ADMIN_TOKEN" \
  -d '{
    "name": "categories",
    "type": "base",
    "schema": [
      {"id": "name", "name": "name", "type": "text", "required": true},
      {"id": "color", "name": "color", "type": "text"},
      {"id": "userId", "name": "userId", "type": "relation", "collectionId": "_pb_users_auth_", "required": true}
    ]
  }' > /dev/null

# Create budgets collection (zero-based budgeting per category/month)
# The Budget page queries: filter=(userId=..&&year=..&&month=..) and reads
# fields category, budgetAmount, year, month.
curl -s -X POST "$POCKETBASE_URL/api/collections" \
  -H "Content-Type: application/json" \
  -H "Authorization: $ADMIN_TOKEN" \
  -d '{
    "name": "budgets",
    "type": "base",
    "schema": [
      {"id": "category", "name": "category", "type": "text", "required": true},
      {"id": "budgetAmount", "name": "budgetAmount", "type": "number", "required": true},
      {"id": "year", "name": "year", "type": "number", "required": true},
      {"id": "month", "name": "month", "type": "number", "required": true},
      {"id": "userId", "name": "userId", "type": "relation", "collectionId": "_pb_users_auth_", "required": true}
    ]
  }' > /dev/null

# Create rules collection (for auto-categorization)
curl -s -X POST "$POCKETBASE_URL/api/collections" \
  -H "Content-Type: application/json" \
  -H "Authorization: $ADMIN_TOKEN" \
  -d '{
    "name": "rules",
    "type": "base",
    "schema": [
      {"id": "name", "name": "name", "type": "text", "required": true},
      {"id": "pattern", "name": "pattern", "type": "text", "required": true},
      {"id": "category", "name": "category", "type": "relation", "collectionId": "categories", "required": true},
      {"id": "userId", "name": "userId", "type": "relation", "collectionId": "_pb_users_auth_", "required": true}
    ]
  }' > /dev/null

# Create statements collection (for uploaded bank statements)
curl -s -X POST "$POCKETBASE_URL/api/collections" \
  -H "Content-Type: application/json" \
  -H "Authorization: $ADMIN_TOKEN" \
  -d '{
    "name": "statements",
    "type": "base",
    "schema": [
      {"id": "name", "name": "name", "type": "text", "required": true},
      {"id": "file", "name": "file", "type": "file"},
      {"id": "uploadDate", "name": "uploadDate", "type": "date", "required": true},
      {"id": "accountId", "name": "accountId", "type": "relation", "collectionId": "accounts", "required": true},
      {"id": "userId", "name": "userId", "type": "relation", "collectionId": "_pb_users_auth_", "required": true}
    ]
  }' > /dev/null

echo "Collections created successfully!"
