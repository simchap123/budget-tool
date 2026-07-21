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
    const desc = e.record.get("description");
    const uid = e.record.get("userId");
    // categorize_lib.js is generated from the user's labeled history and is
    // gitignored (it embeds real payee names); if it's absent the require throws
    // and the catch below leaves the category untouched.
    const { merchantKey, categorize } = require(`${__hooks}/categorize_lib.js`);
    const key = merchantKey(String(desc || ""));
    // 1) the user's own vendor mapping wins (their personal rulebook)
    if (key && uid) {
      try {
        const v = $app.dao().findFirstRecordByFilter(
          "vendors", "userId = {:u} && matchKey = {:k}", { u: uid, k: key }
        );
        if (v && v.get("category")) { e.record.set("category", v.get("category")); return; }
      } catch (err) { /* no vendor for this merchant yet */ }
    }
    // 2) fall back to the global categorizer
    const cat = categorize(desc);
    if (cat) e.record.set("category", cat);
  } catch (err) {
    // ignore — leave the category as-is
  }
}, "transactions");

// POST /api/rpc/merge-category  { from, to }  -> { movedTxns, budgetMerged }
// Merge category `from` into `to`: re-file every transaction, fold budgets
// (sum the amounts), re-point vendors, and delete the leftover `from` category
// record. Owner-scoped. Used by the "Merge categories" and "Merge budgets" UIs.
routerAdd("POST", "/api/rpc/merge-category", (c) => {
  try {
    const info = $apis.requestInfo(c);
    const user = info.authRecord;
    const from = String((info.data && info.data.from) || "").trim();
    const to = String((info.data && info.data.to) || "").trim();
    if (!from || !to) throw new Error("from and to are required");
    if (from === to) throw new Error("from and to must differ");

    const dao = $app.dao();

    // 1) Re-file transactions.
    const txns = dao.findRecordsByFilter(
      "transactions", "userId = {:u} && category = {:c}", "-created", 100000, 0, { u: user.id, c: from }
    );
    let movedTxns = 0;
    txns.forEach((r) => { r.set("category", to); dao.saveRecord(r); movedTxns++; });

    // 2) Fold budgets: add the `from` budget amount into `to` (create if needed), delete `from`.
    let budgetMerged = false;
    try {
      const fromBudgets = dao.findRecordsByFilter("budgets", "userId = {:u} && category = {:c}", "-created", 50, 0, { u: user.id, c: from });
      if (fromBudgets.length) {
        let fromAmt = 0;
        fromBudgets.forEach((b) => { fromAmt += Number(b.get("budgetAmount")) || 0; });
        const toBudgets = dao.findRecordsByFilter("budgets", "userId = {:u} && category = {:c}", "-created", 50, 0, { u: user.id, c: to });
        if (toBudgets.length) {
          const t = toBudgets[0];
          t.set("budgetAmount", (Number(t.get("budgetAmount")) || 0) + fromAmt);
          dao.saveRecord(t);
        } else {
          const nb = new Record(dao.findCollectionByNameOrId("budgets"));
          nb.set("userId", user.id); nb.set("category", to); nb.set("budgetAmount", fromAmt);
          nb.set("year", new Date().getFullYear()); nb.set("month", new Date().getMonth() + 1);
          dao.saveRecord(nb);
        }
        fromBudgets.forEach((b) => dao.deleteRecord(b));
        budgetMerged = true;
      }
    } catch (e) { /* budgets optional */ }

    // 3) Re-point vendors that carried the `from` category.
    try {
      const vends = dao.findRecordsByFilter("vendors", "userId = {:u} && category = {:c}", "-count", 5000, 0, { u: user.id, c: from });
      vends.forEach((v) => { v.set("category", to); dao.saveRecord(v); });
    } catch (e) { /* vendors optional */ }

    // 4) Delete the leftover `from` category record(s).
    try {
      const cats = dao.findRecordsByFilter("categories", "userId = {:u} && name = {:c}", "-created", 50, 0, { u: user.id, c: from });
      cats.forEach((r) => dao.deleteRecord(r));
    } catch (e) { /* category may be string-only */ }

    return c.json(200, { movedTxns: movedTxns, budgetMerged: budgetMerged });
  } catch (err) {
    return c.json(400, { error: String((err && err.message) || err) });
  }
}, $apis.requireRecordAuth());

// POST /api/rpc/merge-vendor  { fromKey, toKey }  -> { movedTxns }
// Merge vendor `fromKey` into `toKey`: give every transaction that rolls up to
// fromKey the category of the target vendor, then delete the fromKey vendor
// record. (Transactions roll up by merchant key derived from the description, so
// this aligns their category; the target vendor's name/category becomes the home.)
routerAdd("POST", "/api/rpc/merge-vendor", (c) => {
  try {
    const info = $apis.requestInfo(c);
    const user = info.authRecord;
    const fromKey = String((info.data && info.data.fromKey) || "").trim();
    const toKey = String((info.data && info.data.toKey) || "").trim();
    if (!fromKey || !toKey) throw new Error("fromKey and toKey are required");
    if (fromKey === toKey) throw new Error("fromKey and toKey must differ");

    const dao = $app.dao();
    const toVendor = dao.findFirstRecordByFilter("vendors", "userId = {:u} && matchKey = {:k}", { u: user.id, k: toKey });
    const fromVendor = dao.findFirstRecordByFilter("vendors", "userId = {:u} && matchKey = {:k}", { u: user.id, k: fromKey });
    if (!toVendor) throw new Error("target vendor not found");

    const cat = toVendor.get("category");
    let movedTxns = 0;
    if (cat) {
      // Re-file the fromKey vendor's transactions into the target's category.
      const txns = dao.findRecordsByFilter(
        "transactions", "userId = {:u} && description ~ {:k}", "-created", 100000, 0, { u: user.id, k: fromKey }
      );
      txns.forEach((r) => { r.set("category", cat); dao.saveRecord(r); movedTxns++; });
    }
    // Fold the from vendor's count into the target and remove it.
    if (fromVendor) {
      toVendor.set("count", (Number(toVendor.get("count")) || 0) + (Number(fromVendor.get("count")) || 0));
      dao.saveRecord(toVendor);
      dao.deleteRecord(fromVendor);
    }
    return c.json(200, { movedTxns: movedTxns });
  } catch (err) {
    return c.json(400, { error: String((err && err.message) || err) });
  }
}, $apis.requireRecordAuth());
