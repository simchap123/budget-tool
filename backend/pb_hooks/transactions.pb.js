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
    if (!term || !category) throw new Error("term and category are required");

    const dao = $app.dao();
    const records = dao.findRecordsByFilter(
      "transactions",
      "userId = {:u} && description ~ {:t}",
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
