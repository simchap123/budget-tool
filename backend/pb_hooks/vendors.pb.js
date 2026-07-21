/// <reference path="../pb_data/types.d.ts" />
// Vendor layer routes. A vendor is a normalized merchant (matchKey = the same
// key the categorizer computes). Setting a vendor's category cascades to every
// transaction from that merchant.

// POST /api/vendors/set-category  { matchKey, category }  -> { updated }
routerAdd("POST", "/api/vendors/set-category", (c) => {
  try {
    const info = $apis.requestInfo(c);
    const user = info.authRecord;
    const d = info.data || {};
    const matchKey = String(d.matchKey || "").trim();
    const category = String(d.category || "").trim();
    if (!matchKey || !category) throw new Error("matchKey and category are required");

    const { merchantKey } = require(`${__hooks}/categorize_lib.js`);
    const dao = $app.dao();

    // update (or create) the vendor record
    let vendor = null;
    try {
      vendor = dao.findFirstRecordByFilter("vendors", "userId = {:u} && matchKey = {:k}", { u: user.id, k: matchKey });
    } catch (e) { vendor = null; }
    if (vendor) { vendor.set("category", category); dao.saveRecord(vendor); }

    // cascade to every transaction from this merchant
    const records = dao.findRecordsByFilter("transactions", "userId = {:u}", "-created", 100000, 0, { u: user.id });
    let updated = 0;
    records.forEach((r) => {
      if (merchantKey(String(r.get("description") || "")) !== matchKey) return;
      if (r.get("category") === category) return;
      r.set("category", category);
      dao.saveRecord(r);
      updated++;
    });
    return c.json(200, { updated: updated });
  } catch (err) {
    return c.json(400, { error: String((err && err.message) || err) });
  }
}, $apis.requireRecordAuth());

// POST /api/vendors/rename  { matchKey, name }  -> { ok: true }
// Rename a vendor's display name (does not touch transactions — only the label).
routerAdd("POST", "/api/vendors/rename", (c) => {
  try {
    const info = $apis.requestInfo(c);
    const user = info.authRecord;
    const d = info.data || {};
    const matchKey = String(d.matchKey || "").trim();
    const name = String(d.name || "").trim();
    if (!matchKey || !name) throw new Error("matchKey and name are required");

    const dao = $app.dao();
    let vendor = null;
    try {
      vendor = dao.findFirstRecordByFilter("vendors", "userId = {:u} && matchKey = {:k}", { u: user.id, k: matchKey });
    } catch (e) { vendor = null; }
    if (!vendor) throw new Error("vendor not found");
    vendor.set("name", name);
    dao.saveRecord(vendor);
    return c.json(200, { ok: true });
  } catch (err) {
    return c.json(400, { error: String((err && err.message) || err) });
  }
}, $apis.requireRecordAuth());

// POST /api/vendors/rebuild -> { vendors, created, updated }
// Regenerate the caller's vendor list from their transactions (majority category
// + count per merchant). Run after a big import to pick up new merchants.
routerAdd("POST", "/api/vendors/rebuild", (c) => {
  try {
    const info = $apis.requestInfo(c);
    const user = info.authRecord;
    const { merchantKey } = require(`${__hooks}/categorize_lib.js`);
    const dao = $app.dao();
    const vendorsCol = dao.findCollectionByNameOrId("vendors");

    const txns = dao.findRecordsByFilter("transactions", "userId = {:u}", "-created", 100000, 0, { u: user.id });
    const groups = {}; // key -> { counts, total }
    txns.forEach((t) => {
      const k = merchantKey(String(t.get("description") || ""));
      if (!k) return;
      if (!groups[k]) groups[k] = { counts: {}, total: 0 };
      const cat = t.get("category") || "Random";
      groups[k].counts[cat] = (groups[k].counts[cat] || 0) + 1;
      groups[k].total++;
    });

    const existing = dao.findRecordsByFilter("vendors", "userId = {:u}", "-created", 100000, 0, { u: user.id });
    const byKey = {};
    existing.forEach((v) => { byKey[v.get("matchKey")] = v; });

    const titleCase = (k) => String(k).toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
    let created = 0, updated = 0;
    Object.keys(groups).forEach((key) => {
      const g = groups[key];
      let topCat = "Random", topN = -1;
      Object.keys(g.counts).forEach((cat) => { if (g.counts[cat] > topN) { topN = g.counts[cat]; topCat = cat; } });
      const ex = byKey[key];
      if (ex) {
        ex.set("count", g.total);
        // keep an explicitly-set vendor category; only fill if empty
        if (!ex.get("category")) ex.set("category", topCat);
        dao.saveRecord(ex);
        updated++;
      } else {
        const rec = new Record(vendorsCol);
        rec.set("userId", user.id);
        rec.set("name", titleCase(key));
        rec.set("matchKey", key);
        rec.set("category", topCat);
        rec.set("count", g.total);
        dao.saveRecord(rec);
        created++;
      }
    });
    return c.json(200, { vendors: Object.keys(groups).length, created: created, updated: updated });
  } catch (err) {
    return c.json(400, { error: String((err && err.message) || err) });
  }
}, $apis.requireRecordAuth());
