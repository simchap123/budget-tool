import axios from 'axios'

// Bulk auto-categorization driver.
//
// The backend endpoint (`POST /api/ai/categorize-uncategorized`) processes up to
// 80 uncategorized transactions per call and reports how many it `updated` and
// how many `remaining` still lack a category. We loop it until the queue is
// drained — but with two independent brakes so a stuck backend can never spin
// forever: stop when a call makes no progress (`updated === 0`), and a hard cap
// on iterations.

// 80 txns/batch; a large backlog (a full imported history) can need many rounds.
const MAX_ITERATIONS = 60

// Pure loop-termination predicate, exported so the loop logic is unit-testable
// without any network. Returns true when we should make another request.
export function shouldContinue(updated: number, remaining: number, iterations: number): boolean {
  if (iterations >= MAX_ITERATIONS) return false // hard cap
  if (remaining <= 0) return false // queue drained
  if (updated <= 0) return false // no progress this round — avoid an infinite loop
  return true
}

// Repeatedly asks the backend to categorize the caller's uncategorized
// transactions. Calls `onProgress` with the running total after each batch.
// Resolves with the total number of transactions categorized.
export async function runAutoCategorize(onProgress?: (updated: number) => void): Promise<number> {
  const auth = JSON.parse(localStorage.getItem('pb_auth') || '{}')
  const apiUrl = import.meta.env.VITE_API_URL || '/api'
  const headers = { Authorization: `Bearer ${auth.token}` }

  let total = 0
  let iterations = 0

  // Always run at least once; `shouldContinue` decides whether to keep going.
  while (iterations < MAX_ITERATIONS) {
    const { data } = await axios.post(
      `${apiUrl}/ai/categorize-uncategorized`,
      {},
      { headers }
    )
    const updated = Number(data?.updated || 0)
    const remaining = Number(data?.remaining || 0)
    total += updated
    iterations++
    if (onProgress) onProgress(total)
    if (!shouldContinue(updated, remaining, iterations)) break
  }

  return total
}
