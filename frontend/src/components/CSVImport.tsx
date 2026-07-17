import { useState } from 'react'
import axios from 'axios'

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
      const headers = rows[0].split(',').map(h => h.trim())

      const data = rows.slice(1).map(row => {
        const values = row.split(',').map(v => v.trim())
        return headers.reduce((obj, header, idx) => {
          obj[header.toLowerCase()] = values[idx]
          return obj
        }, {} as any)
      })

      setPreview(data.slice(0, 5))
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
      const headers = rows[0].split(',').map(h => h.trim())

      let imported = 0
      let failed = 0

      for (let i = 1; i < rows.length; i++) {
        try {
          const values = rows[i].split(',').map(v => v.trim())
          const data = headers.reduce((obj, header, idx) => {
            obj[header.toLowerCase()] = values[idx]
            return obj
          }, {} as any)

          // Map common CSV column names
          const date = data.date || data.Date || new Date().toISOString()
          const description = data.description || data.Description || data.memo || data.Memo || ''
          const amount = parseFloat(data.amount || data.Amount || '0')
          const type = (data.type || data.Type || 'expense').toLowerCase()
          const category = data.category || data.Category || 'Uncategorized'

          if (!description || amount === 0) {
            failed++
            continue
          }

          await axios.post(
            `${apiUrl}/collections/transactions/records`,
            {
              amount: Math.abs(amount),
              description,
              type: type === 'income' || type === 'in' ? 'income' : 'expense',
              category,
              userId: auth.record.id,
              created: date,
            },
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
              hover:file:bg-accent-sunset-soft"
          />
          <p className="mt-2 text-body-sm text-ink-500">
            Format: date, description, amount, type (income/expense), category
          </p>
        </div>

        {error && (
          <div className="rounded-sm border border-accent-dusk bg-accent-dusk bg-opacity-10 p-3 text-accent-dusk text-sm">
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
            <p className="text-body-sm text-ink-300 mb-2">Preview (first 5 rows):</p>
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
          className="btn-primary w-full py-2"
        >
          {loading ? 'Importing...' : 'Import Transactions'}
        </button>
      </div>
    </div>
  )
}
