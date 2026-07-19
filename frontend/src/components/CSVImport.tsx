import { useState } from 'react'
import axios from 'axios'
import { trackImport } from '../utils/analytics'
import { parseCSVLine } from '../utils/csv'
import { csvRowToTransaction, hasSignedAmounts } from '../utils/csvImport'

// Retry POSTs that hit API rate limiting (429/503) with linear backoff, so a
// large import (e.g. 1,500-row Chase export) doesn't silently drop rows.
async function postWithRetry(url: string, body: any, config: any, retries = 5): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await axios.post(url, body, config)
      return
    } catch (e: any) {
      const status = e?.response?.status
      if ((status === 429 || status === 503) && attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
        continue
      }
      throw e
    }
  }
}

export function CSVImport({ onImportComplete }: { onImportComplete: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError('')
    setSuccess('')

    const reader = new FileReader()
    reader.onload = (event) => {
      const csv = event.target?.result as string
      const rows = csv.split('\n').filter(row => row.trim())
      if (rows.length < 2) { setPreview([]); return }
      const headers = parseCSVLine(rows[0]).map(h => h.trim())
      const parsedRows = rows.slice(1).map(r => parseCSVLine(r).map(v => v.trim()))
      const signed = hasSignedAmounts(headers, parsedRows)

      // Show what will actually be imported (parsed), so signed/Chase amounts and
      // income-vs-expense direction can be sanity-checked before committing.
      const preview = parsedRows
        .slice(0, 5)
        .map(vals => csvRowToTransaction(headers, vals, '', signed))
        .filter((t): t is NonNullable<typeof t> => t !== null)
        .map(t => ({
          Date: String(t.date).slice(0, 10),
          Description: t.description,
          Amount: `${t.type === 'income' ? '+' : '-'}$${t.amount.toFixed(2)}`,
          Type: t.type,
        }))
      setPreview(preview)
    }

    reader.readAsText(selectedFile)
  }

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }

    setLoading(true)

    try {
      const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
      const apiUrl = import.meta.env.VITE_API_URL || '/api'

      const csv = await file.text()
      const rows = csv.split('\n').filter(row => row.trim())
      const headers = parseCSVLine(rows[0]).map(h => h.trim())
      const parsedRows = rows.slice(1).map(r => parseCSVLine(r).map(v => v.trim()))
      // If the file has any negative amount (a Chase-style signed export), let the
      // sign decide income vs expense instead of defaulting everything to expense.
      const signed = hasSignedAmounts(headers, parsedRows)

      let imported = 0
      let failed = 0

      for (let i = 0; i < parsedRows.length; i++) {
        try {
          const values = parsedRows[i]
          const txn = csvRowToTransaction(headers, values, auth.record.id, signed)
          if (!txn) {
            failed++
            continue
          }

          await postWithRetry(
            `${apiUrl}/collections/transactions/records`,
            txn,
            {
              headers: {
                Authorization: `Bearer ${auth.token}`,
              },
            }
          )

          imported++
        } catch (err) {
          failed++
        }
      }

      setSuccess(`✅ Imported ${imported} transactions${failed > 0 ? ` (${failed} failed)` : ''}`)
      trackImport(imported)
      setFile(null)
      setPreview([])

      setTimeout(() => {
        onImportComplete()
      }, 1000)
    } catch (err: any) {
      console.error('Import error:', err)
      setError('Failed to import CSV: ' + (err.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-normal text-ink-50 mb-4">Import Transactions from CSV</h3>


      <div className="space-y-4">
        <div>
          <label className="block text-body-sm font-normal text-ink-200 mb-2">
            CSV File (Date, Description, Amount, Type, Category)
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-ink-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-sm file:border-0
              file:text-sm file:font-normal
              file:bg-accent-sunset file:text-canvas
              hover:file:bg-accent-sunset-soft
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="mt-2 text-body-sm text-ink-500">
            Format: date, description, amount, type (income/expense), category
          </p>
        </div>

        {error && (
          <div className="rounded-sm border border-red-700 bg-red-500/10 p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-sm border border-accent-breeze bg-accent-breeze bg-opacity-10 p-3 text-accent-breeze text-sm">
            {success}
          </div>
        )}

        {preview.length > 0 && (
          <div>
            <p className="text-body-sm text-ink-300 mb-2">Preview — what will be imported (first 5):</p>
            <div className="overflow-x-auto rounded-sm border border-ink-700 bg-canvas-card">
              <table className="table-minimal w-full">
                <thead>
                  <tr>
                    {Object.keys(preview[0]).slice(0, 4).map(key => (
                      <th key={key} className="text-left">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).slice(0, 4).map((val, cidx) => (
                        <td key={cidx} className="text-ink-300 text-sm">
                          {String(val).substring(0, 30)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={!file || loading}
          className="btn-primary w-full py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Importing...' : 'Import Transactions'}
        </button>
      </div>
    </div>
  )
}
