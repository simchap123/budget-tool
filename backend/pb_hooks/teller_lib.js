// Helpers for the Teller integration (teller.io). require()'d inside the hook
// handlers (PocketBase JSVM handlers don't share the file's top-level scope).
// Pure functions here are unit-tested from the frontend suite via teller_lib.d.ts.

function prettyCategory(c) {
  const s = String(c || "").trim();
  if (!s) return "Uncategorized";
  return s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

// Map a Teller transaction to our transactions shape. Teller amounts are SIGNED
// strings — negative = money out (expense), positive = money in (income). We store
// the Teller id in `plaidId` (our generic external-id / bank-synced marker) so
// dedup and the "synced from bank" indicator work without a schema change.
function mapTellerTxn(t, userId) {
  const amt = parseFloat(t.amount);
  const cat =
    t.details && t.details.category ? prettyCategory(t.details.category) : "Uncategorized";
  return {
    amount: Number.isFinite(amt) ? Math.abs(amt) : 0,
    description: t.description || "Transaction",
    type: amt < 0 ? "expense" : "income",
    category: cat,
    date: (t.date || "") + " 00:00:00.000Z",
    userId: userId,
    plaidId: t.id,
  };
}

module.exports = { mapTellerTxn, prettyCategory };
