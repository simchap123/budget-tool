# Data Retention & Deletion Policy — Budget Tool

**Owner:** Simcha Pentelnik (sole operator) · **Effective:** 2026-07-21
**Contact:** spentelnik@gmail.com

## 1. Purpose
Define how long Budget Tool keeps consumer data and how it is deleted, so data is retained
only as long as needed to provide the service.

## 2. Data categories & retention

| Data | Retention |
|---|---|
| Account (email, auth) | While the account is active; deleted on account deletion. |
| Bank data from Plaid (accounts, balances, transactions) | While the account is active or until the user deletes it / disconnects and deletes. |
| Imported transactions (CSV, email) | Same as above. |
| Raw inbound email bodies (`inbound_emails.raw`) | Deleted immediately after the transaction is extracted (cleared on successful processing). |
| User-created content (categories, budgets, vendors, goals) | While the account is active. |
| Server/application logs | Rolling, short-lived operational logs; not used beyond operating and securing the service. |
| Backups | Retained on a rolling basis for disaster recovery; purged on the backup rotation schedule. |

## 3. Deletion rights & process
- A user may request deletion of their account and all associated data at any time by emailing
  **spentelnik@gmail.com**.
- Requests are honored within **30 days**. Deletion removes the user's records from the primary
  database; residual copies in backups age out on the normal backup rotation.
- Disconnecting a linked bank stops further syncing; previously imported transactions remain
  until the user deletes them or deletes the account.
- Users can self-serve partial deletion in-app (delete individual transactions; discard
  email-captured items from the review queue; pause/rotate their private email address).

## 4. Third-party deletion
On account deletion, any linked Plaid Items are removed so Plaid stops providing data for that
user. Google Gemini receives only transient transaction descriptions for categorization and
retains no account per Google's API terms.

## 5. Review
Reviewed at least annually. Last review: 2026-07-21.
