/// <reference path="../pb_data/types.d.ts" />
// Category suggestion for Budget Tool (PocketBase v0.20.x JSVM).
//   POST /api/ai/suggest-category  { description }  -> { category, source }
//
// Strategy (remembers the user's trends):
//   1) HISTORY: find the user's past transactions for the same merchant token and
//      return the category they used most often. Free, instant, personalized.
//   2) GEMINI fallback (if GEMINI_API_KEY set + has quota) for unseen merchants.
//
// NOTE: everything the handler needs is defined INSIDE it — PocketBase JSVM
// handlers do not share the file's top-level scope.

routerAdd("POST", "/api/ai/suggest-category", (c) => {
  try {
    const { merchantTokens } = require(`${__hooks}/ai_lib.js`);

    const info = $apis.requestInfo(c);
    const user = info.authRecord;
    const desc = (info.data.description || "").trim();
    if (!desc) return c.json(200, { category: "", source: "empty" });

    const dao = $app.dao();

    // 1) History match on the strongest merchant token.
    const tokens = merchantTokens(desc);
    for (let i = 0; i < Math.min(tokens.length, 3); i++) {
      const matches = dao.findRecordsByFilter(
        "transactions",
        "userId = {:u} && description ~ {:d} && category != '' && category != 'Uncategorized'",
        "-created", 60, 0, { u: user.id, d: tokens[i] }
      );
      if (matches.length) {
        const counts = {};
        matches.forEach(function (m) {
          const cat = m.get("category");
          counts[cat] = (counts[cat] || 0) + 1;
        });
        let best = "", n = 0;
        for (const k in counts) if (counts[k] > n) { n = counts[k]; best = k; }
        return c.json(200, { category: best, source: "history", match: tokens[i] });
      }
    }

    // 2) Gemini fallback (only if a key is configured and has quota).
    const key = $os.getenv("GEMINI_API_KEY");
    if (key) {
      const cats = dao.findRecordsByFilter(
        "transactions", "userId = {:u} && category != ''", "-created", 300, 0, { u: user.id }
      );
      const seen = {};
      cats.forEach(function (r) { seen[r.get("category")] = 1; });
      const catList = Object.keys(seen).slice(0, 40);
      const prompt =
        "You categorize a bank transaction into ONE short budget category. " +
        "Prefer one of the user's existing categories if it fits: [" + catList.join(", ") + "]. " +
        'Transaction description: "' + desc + '". Reply with ONLY the category name, nothing else.';
      try {
        const res = $http.send({
          url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + key,
          method: "POST",
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          headers: { "Content-Type": "application/json" },
          timeout: 20,
        });
        if (res.statusCode === 200 && res.json && res.json.candidates) {
          const text = res.json.candidates[0].content.parts[0].text || "";
          const cat = text.trim().split("\n")[0].replace(/^["'#*\-\s]+|["'.\s]+$/g, "");
          if (cat) return c.json(200, { category: cat, source: "ai" });
        }
      } catch (e) { /* fall through */ }
    }

    return c.json(200, { category: "", source: "none" });
  } catch (err) {
    return c.json(200, { category: "", source: "error", detail: String((err && err.message) || err) });
  }
}, $apis.requireRecordAuth());

// POST /api/ai/insights  { summary }  ->  { narrative, habits: string[], source }
//
// The frontend computes the spending summary (totals, top categories, recurring,
// savings rate) from the user's transactions and sends it here; we ask Gemini to
// turn it into a short, encouraging read on the user's money trends and habits.
// Purely additive: on any failure it returns empty strings so the onboarding
// still shows its deterministic stats and budget suggestions.
routerAdd("POST", "/api/ai/insights", (c) => {
  try {
    const info = $apis.requestInfo(c);
    const summary = info.data.summary;
    if (!summary) return c.json(200, { narrative: "", habits: [], source: "empty" });

    const key = $os.getenv("GEMINI_API_KEY");
    if (!key) return c.json(200, { narrative: "", habits: [], source: "no-key" });

    const prompt =
      "You are a warm, practical personal-finance coach. Using ONLY the JSON spending " +
      "summary below, write a short 2-3 sentence overview of this person's money trends, " +
      "then list 3 to 5 specific habits or patterns you notice (each a short phrase, no more " +
      "than ~12 words). Be encouraging and concrete; never invent numbers not in the data. " +
      'Return STRICT JSON only: {"narrative": string, "habits": string[]}. ' +
      "Summary: " + JSON.stringify(summary);

    const res = $http.send({
      url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + key,
      method: "POST",
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4 },
      }),
      headers: { "Content-Type": "application/json" },
      timeout: 30,
    });

    if (res.statusCode === 200 && res.json && res.json.candidates) {
      let text = (res.json.candidates[0].content.parts[0].text || "").replace(/```json|```/g, "").trim();
      try {
        const parsed = JSON.parse(text);
        return c.json(200, {
          narrative: String(parsed.narrative || ""),
          habits: Array.isArray(parsed.habits) ? parsed.habits.slice(0, 6).map(String) : [],
          source: "ai",
        });
      } catch (e) {
        // Model didn't return clean JSON — hand back the prose as the narrative.
        return c.json(200, { narrative: text.slice(0, 600), habits: [], source: "ai-text" });
      }
    }
    return c.json(200, { narrative: "", habits: [], source: "none" });
  } catch (err) {
    return c.json(200, { narrative: "", habits: [], source: "error", detail: String((err && err.message) || err) });
  }
}, $apis.requireRecordAuth());

// POST /api/ai/categorize-uncategorized  ->  { updated, remaining }
//
// Bulk-categorizes the caller's uncategorized transactions. Same two-tier
// strategy as suggest-category, applied in batch:
//   1) HISTORY: for each uncategorized txn, look at its strongest merchant
//      tokens and reuse the category the user has most often given the same
//      merchant. Free, instant, personalized.
//   2) GEMINI: whatever history can't place is sent to Gemini in groups of 40,
//      biased toward the user's existing categories.
// Processes up to 80 txns per call; the frontend loops until `remaining` is 0.
// Never 500s — any failure returns {updated:0, error} so the caller can stop.
routerAdd("POST", "/api/ai/categorize-uncategorized", (c) => {
  try {
    const { merchantTokens } = require(`${__hooks}/ai_lib.js`);

    const info = $apis.requestInfo(c);
    const user = info.authRecord;
    const dao = $app.dao();

    // The queue: the caller's uncategorized transactions, newest first.
    const pending = dao.findRecordsByFilter(
      "transactions",
      "userId = {:u} && (category = '' || category = 'Uncategorized')",
      "-date", 80, 0, { u: user.id }
    );
    const fetchedCount = pending.length;
    if (!fetchedCount) return c.json(200, { updated: 0, remaining: 0 });

    // The user's known categories (from their already-categorized history),
    // used both to bias Gemini and — via history matching — to place merchants
    // they've labeled before.
    const known = dao.findRecordsByFilter(
      "transactions",
      "userId = {:u} && category != '' && category != 'Uncategorized'",
      "-created", 500, 0, { u: user.id }
    );
    const catSeen = {};
    known.forEach(function (r) { catSeen[r.get("category")] = 1; });
    const catList = Object.keys(catSeen).slice(0, 60);

    var updated = 0;
    const needsAi = [];

    // Tier 1: history match on the strongest merchant tokens.
    for (let p = 0; p < pending.length; p++) {
      const txn = pending[p];
      const desc = txn.get("description") || "";
      const tokens = merchantTokens(desc);
      let best = "";
      for (let i = 0; i < Math.min(tokens.length, 3) && !best; i++) {
        const matches = dao.findRecordsByFilter(
          "transactions",
          "userId = {:u} && description ~ {:token} && category != '' && category != 'Uncategorized'",
          "-created", 60, 0, { u: user.id, token: tokens[i] }
        );
        if (matches.length) {
          const counts = {};
          matches.forEach(function (m) {
            const cat = m.get("category");
            counts[cat] = (counts[cat] || 0) + 1;
          });
          let n = 0;
          for (const k in counts) if (counts[k] > n) { n = counts[k]; best = k; }
        }
      }
      if (best) {
        txn.set("category", best);
        dao.saveRecord(txn);
        updated++;
      } else {
        needsAi.push(txn);
      }
    }

    // Tier 2: Gemini for whatever history couldn't place, in batches of 40.
    const key = $os.getenv("GEMINI_API_KEY");
    if (key && needsAi.length) {
      for (let start = 0; start < needsAi.length; start += 40) {
        const batch = needsAi.slice(start, start + 40);
        const lines = batch
          .map(function (t, idx) { return (idx + 1) + ". " + (t.get("description") || ""); })
          .join("\n");
        const prompt =
          "You categorize bank transactions into short budget categories. " +
          "Prefer one of the user's existing categories if it fits: [" + catList.join(", ") + "]. " +
          'For each numbered transaction below output a JSON array of {"i":number,"category":string}, ' +
          "concise (1-2 words). Transactions:\n" + lines;
        try {
          const res = $http.send({
            url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + key,
            method: "POST",
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2 },
            }),
            headers: { "Content-Type": "application/json" },
            timeout: 40,
          });
          if (res.statusCode === 200 && res.json && res.json.candidates) {
            let text = (res.json.candidates[0].content.parts[0].text || "").replace(/```json|```/g, "").trim();
            const arr = JSON.parse(text);
            if (Array.isArray(arr)) {
              arr.forEach(function (item) {
                const idx = Number(item && item.i) - 1;
                const cat = String((item && item.category) || "").trim();
                if (cat && idx >= 0 && idx < batch.length) {
                  batch[idx].set("category", cat);
                  dao.saveRecord(batch[idx]);
                  updated++;
                }
              });
            }
          }
        } catch (e) { /* skip this batch, keep going */ }
      }
    }

    const remaining = Math.max(0, fetchedCount - updated);
    return c.json(200, { updated: updated, remaining: remaining });
  } catch (err) {
    return c.json(200, { updated: 0, error: String((err && err.message) || err) });
  }
}, $apis.requireRecordAuth());
