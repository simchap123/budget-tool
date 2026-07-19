// CommonJS helper module for the Plaid hooks (required inside each route handler,
// because PocketBase JSVM handlers don't share the file's top-level scope).
// Uses the global $os / $http provided by the PocketBase JSVM runtime.

function plaidBase() {
  return ($os.getenv("PLAID_ENV") || "sandbox") === "production"
    ? "https://production.plaid.com"
    : "https://sandbox.plaid.com";
}
function plaidSecret() {
  return ($os.getenv("PLAID_ENV") || "sandbox") === "production"
    ? $os.getenv("PLAID_SECRET_PRODUCTION")
    : $os.getenv("PLAID_SECRET_SANDBOX");
}
function plaidCall(path, payload) {
  const body = Object.assign(
    { client_id: $os.getenv("PLAID_CLIENT_ID"), secret: plaidSecret() },
    payload
  );
  const res = $http.send({
    url: plaidBase() + path,
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    timeout: 60,
  });
  const data = res.json;
  if (res.statusCode >= 400) {
    const err = new Error(
      "Plaid error: " + ((data && (data.error_message || data.error_code)) || res.statusCode)
    );
    err.plaidCode = data && data.error_code;
    throw err;
  }
  return data;
}
function prettyCategory(c) {
  return String(c).toLowerCase().split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function mapTxn(t, userId) {
  // Plaid: amount > 0 => money OUT (expense); amount < 0 => money IN (income)
  const category =
    (t.personal_finance_category && t.personal_finance_category.primary) ||
    (t.category && t.category[0]) || "Uncategorized";
  return {
    amount: Math.abs(t.amount),
    description: t.merchant_name || t.name || "Transaction",
    type: t.amount > 0 ? "expense" : "income",
    category: prettyCategory(category),
    date: (t.date || "") + " 00:00:00.000Z",
    userId: userId,
    plaidId: t.transaction_id,
  };
}

module.exports = { plaidCall, mapTxn };
