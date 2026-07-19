// RFC 4180-style CSV line parser: handles quoted fields, commas inside quotes,
// and escaped double-quotes (""). Used by CSV import (Phase 8).
export function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

// Serialize rows to CSV, quoting any field that contains a comma, quote, or
// newline (RFC 4180). `columns` are the header keys, in order.
export function toCSV(rows: Record<string, unknown>[], columns: string[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const header = columns.join(',')
  const body = rows.map((r) => columns.map((c) => esc(r[c])).join(',')).join('\n')
  return rows.length ? header + '\n' + body : header
}
