/// <reference path="../pb_data/types.d.ts" />
// Transaction utility routes (PocketBase v0.20.x JSVM).

// POST /api/rpc/bulk-recategorize  { term, category }  -> { updated }
// Move every transaction whose description contains `term` into `category`, in one
// server-side pass (much faster and more reliable than one HTTP PATCH per row).
// Owner-scoped: only the authenticated user's own transactions are touched.
routerAdd("POST", "/api/rpc/bulk-recategorize", (c) => {
  try {
    const info = $apis.requestInfo(c);
    const user = info.authRecord;
    const term = String((info.data && info.data.term) || "").trim();
    const category = String((info.data && info.data.category) || "").trim();
    const exact = !!(info.data && info.data.exact);
    if (!term || !category) throw new Error("term and category are required");

    const dao = $app.dao();
    // exact => same description (propagate a change to identical transactions);
    // otherwise => description contains the term (merchant/keyword cleanup).
    const filter = exact
      ? "userId = {:u} && description = {:t}"
      : "userId = {:u} && description ~ {:t}";
    const records = dao.findRecordsByFilter(
      "transactions",
      filter,
      "-created",
      10000,
      0,
      { u: user.id, t: term }
    );

    let updated = 0;
    records.forEach((r) => {
      r.set("category", category);
      dao.saveRecord(r);
      updated++;
    });

    return c.json(200, { updated: updated });
  } catch (err) {
    return c.json(400, { error: String((err && err.message) || err) });
  }
}, $apis.requireRecordAuth());

// POST /api/rpc/recategorize-similar  { description, category, apply }
//   -> { key, count, updated }
// Find every transaction from the SAME merchant as `description` (matched on the
// normalized merchant key, so different dates / transaction codes still group)
// and, when apply is true, move them all to `category`. With apply omitted it
// just previews the count so the UI can confirm before touching anything.
routerAdd("POST", "/api/rpc/recategorize-similar", (c) => {
  try {
    const info = $apis.requestInfo(c);
    const user = info.authRecord;
    const description = String((info.data && info.data.description) || "");
    const category = String((info.data && info.data.category) || "").trim();
    const apply = !!(info.data && info.data.apply);
    if (!description || !category) throw new Error("description and category are required");

    const { merchantKey } = require(`${__hooks}/categorize_lib.js`);
    const key = merchantKey(description);
    if (!key) throw new Error("could not derive a merchant key");

    const dao = $app.dao();
    const records = dao.findRecordsByFilter(
      "transactions", "userId = {:u}", "-created", 100000, 0, { u: user.id }
    );
    let count = 0, updated = 0;
    records.forEach((r) => {
      if (merchantKey(String(r.get("description") || "")) !== key) return;
      count++;
      if (apply && r.get("category") !== category) {
        r.set("category", category);
        dao.saveRecord(r);
        updated++;
      }
    });
    return c.json(200, { key: key, count: count, updated: updated });
  } catch (err) {
    return c.json(400, { error: String((err && err.message) || err) });
  }
}, $apis.requireRecordAuth());

// Auto-categorize on create. When a transaction is added (manual entry or CSV
// import) with no real category, apply the CSV-derived rule table so new
// activity lands in the right bucket the same way existing history was labeled.
// Wrapped in try/catch: a categorization miss must never block the create.
onRecordBeforeCreateRequest((e) => {
  try {
    const cur = String(e.record.get("category") || "").trim();
    if (cur && cur !== "Random" && cur !== "Uncategorized") return;
    // categorize_lib.js is generated from the user's labeled history and is
    // gitignored (it embeds real payee names); if it's absent the require throws
    // and the catch below leaves the category untouched.
    const { categorize } = require(`${__hooks}/categorize_lib.js`);
    const cat = categorize(e.record.get("description"));
    if (cat) e.record.set("category", cat);
  } catch (err) {
    // ignore — leave the category as-is
  }
}, "transactions");
