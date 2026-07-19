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
