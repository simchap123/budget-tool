// Type declarations for the Plaid helper module. The runtime is plain JS (loaded
// by the PocketBase JSVM), but the frontend test suite imports mapTxn to guard the
// amount-sign convention, so these types let `tsc` check that import.

/** A Plaid transaction as returned by /transactions/sync (only the fields mapTxn reads). */
export interface PlaidTransaction {
  amount: number
  merchant_name?: string
  name?: string
  date?: string
  transaction_id?: string
  personal_finance_category?: { primary?: string }
  category?: string[]
}

/** The shape written to the PocketBase `transactions` collection. */
export interface MappedTransaction {
  amount: number
  description: string
  type: 'expense' | 'income'
  category: string
  date: string
  userId: string
  plaidId?: string
}

export function mapTxn(t: PlaidTransaction, userId: string): MappedTransaction
export function plaidCall(path: string, payload: Record<string, unknown>): unknown

/** Fields to write when syncing: preserves the user's category on an existing txn. */
export function syncFields(
  mapped: Record<string, unknown>,
  isExisting: boolean
): Record<string, unknown>
