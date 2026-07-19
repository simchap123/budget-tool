import axios from 'axios'

// Fetch ALL records matching a query, paging past PocketBase's 500-rows-per-page
// cap. Multi-month/all-time aggregations must use this — a single 500-row page
// silently undercounts for accounts with lots of history.
export async function fetchAllRecords(
  apiUrl: string,
  collection: string,
  params: string, // query WITHOUT page/perPage, e.g. "filter=...&sort=-date"
  headers: Record<string, string>
): Promise<any[]> {
  const all: any[] = []
  let page = 1
  for (;;) {
    const sep = params ? '&' : ''
    const r = await axios.get(
      `${apiUrl}/collections/${collection}/records?perPage=500&page=${page}${sep}${params}`,
      { headers }
    )
    all.push(...(r.data.items || []))
    if (page >= (r.data.totalPages || 1)) break
    page++
  }
  return all
}
