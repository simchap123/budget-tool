// Thin wrapper over ExcelJS that turns a plain sheet description into a real
// .xlsx download. ExcelJS is imported dynamically so it lands in its own chunk
// and only loads when a user actually exports — it never weighs down first paint.

export interface XlsxColumn {
  header: string
  key: string
  width?: number
  // Excel number format, e.g. '$#,##0.00' or '0.0"%"'. Applied to the column.
  numFmt?: string
}

export interface XlsxSheet {
  name: string
  columns: XlsxColumn[]
  rows: Record<string, unknown>[]
}

// Excel sheet names are ≤31 chars and may not contain : \ / ? * [ ].
export function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[:\\/?*[\]]/g, ' ').trim()
  return cleaned.slice(0, 31) || 'Sheet'
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.style.display = 'none'
  // The anchor MUST be in the document for Firefox (and some mobile browsers)
  // to honour the click; a detached anchor silently does nothing there.
  document.body.appendChild(a)
  a.click()
  // Revoke on a delay — revoking synchronously can cancel the download before
  // the browser has read the blob.
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 1500)
}

export async function downloadXlsx(sheets: XlsxSheet[], filename: string): Promise<void> {
  const ExcelJS = await import('exceljs')
  const Workbook = (ExcelJS as any).Workbook || (ExcelJS as any).default?.Workbook
  const wb = new Workbook()
  wb.creator = 'Budget Tool'

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sanitizeSheetName(sheet.name))
    ws.columns = sheet.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }))
    ws.addRows(sheet.rows)

    // Bold header row.
    ws.getRow(1).font = { bold: true }
    ws.getRow(1).alignment = { vertical: 'middle' }

    // Apply per-column number formats (skip the header row).
    sheet.columns.forEach((c, i) => {
      if (!c.numFmt) return
      const col = ws.getColumn(i + 1)
      col.numFmt = c.numFmt
    })
    ws.views = [{ state: 'frozen', ySplit: 1 }]
  }

  const buf = await wb.xlsx.writeBuffer()
  triggerDownload(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename
  )
}
