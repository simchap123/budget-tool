// Types for the Teller helper module so the frontend test suite can import mapTellerTxn.

export interface TellerTransaction {
  id: string
  account_id?: string
  amount: string // signed, e.g. "-8.55" (debit) or "1200.00" (credit)
  date?: string // ISO 8601 YYYY-MM-DD
  description?: string
  type?: string
  status?: string
  details?: { category?: string; counterparty?: { name?: string } }
}

export interface MappedTransaction {
  amount: number
  description: string
  type: 'income' | 'expense'
  category: string
  date: string
  userId: string
  plaidId: string
}

export function mapTellerTxn(t: TellerTransaction, userId: string): MappedTransaction
export function prettyCategory(c: string): string
