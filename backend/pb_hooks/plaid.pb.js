/// <reference path="../pb_data/types.d.ts" />
// Plaid integration for Budget Tool (PocketBase v0.20.x JSVM).
// Routes (all require an authenticated user):
//   POST /api/plaid/create-link-token      -> { link_token }
//   POST /api/plaid/exchange-public-token  { public_token, institution? } -> { item_id }
//   POST /api/plaid/sync                    -> { added, modified, removed }
//
// Helpers live in plaid_lib.js and are require()'d inside each handler because
// PocketBase JSVM handlers do NOT share the file's top-level scope.
//
// Env (set on the PocketBase process): PLAID_CLIENT_ID, PLAID_ENV,
//   PLAID_SECRET_SANDBOX, PLAID_SECRET_PRODUCTION

// POST /api/plaid/create-link-token
routerAdd("POST", "/api/plaid/create-link-token", (c) => {
  try {
    const { plaidCall } = require(`${__hooks}/plaid_lib.js`);
    const user = $apis.requestInfo(c).authRecord;
    const payload = {
      user: { client_user_id: user.id },
      client_name: "Budget Tool",
      products: ["transactions"],
      country_codes: ["US"],
      language: "en",
    };
    // Required for OAuth institutions (Chase, etc.) in production.
    const redirect = $os.getenv("PLAID_REDIRECT_URI");
    if (redirect) payload.redirect_uri = redirect;
    const data = plaidCall("/link/token/create", payload);
    return c.json(200, { link_token: data.link_token });
  } catch (err) {
    return c.json(400, { error: String((err && err.message) || err) });
  }
}, $apis.requireRecordAuth());

// POST /api/plaid/exchange-public-token  { public_token, institution }
routerAdd("POST", "/api/plaid/exchange-public-token", (c) => {
  try {
    const { plaidCall } = require(`${__hooks}/plaid_lib.js`);
    const info = $apis.requestInfo(c);
    const user = info.authRecord;
    const publicToken = info.data.public_token;
    if (!publicToken) throw new Error("public_token is required");

    const ex = plaidCall("/item/public_token/exchange", { public_token: publicToken });

    const collection = $app.dao().findCollectionByNameOrId("plaid_items");
    const record = new Record(collection, {
      userId: user.id,
      accessToken: ex.access_token,
      itemId: ex.item_id,
      institution: info.data.institution || "",
      cursor: "",
    });
    $app.dao().saveRecord(record);

    return c.json(200, { item_id: ex.item_id });
  } catch (err) {
    return c.json(400, { error: String((err && err.message) || err) });
  }
}, $apis.requireRecordAuth());

// POST /api/plaid/sync  -> pulls transactions for all of the user's linked items
routerAdd("POST", "/api/plaid/sync", (c) => {
  try {
    const { plaidCall, mapTxn, syncFields } = require(`${__hooks}/plaid_lib.js`);
    const user = $apis.requestInfo(c).authRecord;
    const dao = $app.dao();
    const items = dao.findRecordsByFilter(
      "plaid_items", "userId = {:uid}", "-created", 100, 0, { uid: user.id }
    );
    const txCollection = dao.findCollectionByNameOrId("transactions");

    const findByPlaidId = (plaidId) => {
      try {
        return dao.findFirstRecordByFilter(
          "transactions", "plaidId = {:p} && userId = {:u}", { p: plaidId, u: user.id }
        );
      } catch (e) { return null; }
    };

    let added = 0, modified = 0, removed = 0;
    const needsReauth = [];

    for (const item of items) {
      try {
        let cursor = item.get("cursor") || "";
        let hasMore = true;

        while (hasMore) {
          const payload = { access_token: item.get("accessToken"), count: 250 };
          if (cursor) payload.cursor = cursor;
          const page = plaidCall("/transactions/sync", payload);

          (page.added || []).forEach((t) => {
            if (!findByPlaidId(t.transaction_id)) {
              dao.saveRecord(new Record(txCollection, mapTxn(t, user.id)));
              added++;
            }
          });
          (page.modified || []).forEach((t) => {
            const existing = findByPlaidId(t.transaction_id);
            const rec = existing || new Record(txCollection);
            const fields = syncFields(mapTxn(t, user.id), !!existing);
            for (const k in fields) rec.set(k, fields[k]);
            dao.saveRecord(rec);
            modified++;
          });
          (page.removed || []).forEach((r) => {
            const existing = findByPlaidId(r.transaction_id);
            if (existing) { dao.deleteRecord(existing); removed++; }
          });

          cursor = page.next_cursor;
          hasMore = page.has_more;
        }

        item.set("cursor", cursor);
        if (item.get("needsReauth")) item.set("needsReauth", false); // recovered
        dao.saveRecord(item);
      } catch (e) {
        // A broken connection shouldn't fail the whole sync; flag it for re-auth.
        if (e && e.plaidCode === "ITEM_LOGIN_REQUIRED") {
          item.set("needsReauth", true);
          dao.saveRecord(item);
          needsReauth.push(item.get("itemId"));
        } else {
          console.log("[plaid] sync failed for item", item.get("itemId"), ":", String((e && e.message) || e));
        }
      }
    }

    return c.json(200, { added: added, modified: modified, removed: removed, needsReauth: needsReauth });
  } catch (err) {
    return c.json(400, { error: String((err && err.message) || err) });
  }
}, $apis.requireRecordAuth());

// GET /api/plaid/status -> { connected, items: [{ itemId, institution, needsReauth }] }
routerAdd("GET", "/api/plaid/status", (c) => {
  try {
    const user = $apis.requestInfo(c).authRecord;
    const records = $app.dao().findRecordsByFilter(
      "plaid_items", "userId = {:uid}", "-created", 100, 0, { uid: user.id }
    );
    const items = records.map((i) => ({
      itemId: i.get("itemId"),
      institution: i.get("institution"),
      needsReauth: !!i.get("needsReauth"),
      // The record is saved on every sync, so its built-in `updated` timestamp
      // is effectively "last synced" (no extra schema field needed).
      lastSynced: i.getString("updated"),
    }));
    return c.json(200, { connected: items.length > 0, items: items });
  } catch (err) {
    return c.json(200, { connected: false, items: [] });
  }
}, $apis.requireRecordAuth());

// GET /api/plaid/bank-status?institution_id=ins_56 -> live login health for a bank.
// Chase's `item_logins` status flips to DEGRADED/DOWN during their frequent OAuth
// outages, which surface as a 500 on Chase's authorize page — this lets the UI say
// "Chase is temporarily degraded" instead of showing a confusing failure.
routerAdd("GET", "/api/plaid/bank-status", (c) => {
  try {
    const { plaidCall } = require(`${__hooks}/plaid_lib.js`);
    const instId = (($apis.requestInfo(c).query) || {}).institution_id || "ins_56";
    const data = plaidCall("/institutions/get_by_id", {
      institution_id: instId,
      country_codes: ["US"],
      options: { include_status: true },
    });
    const inst = data.institution || {};
    const st = (inst.status && inst.status.item_logins) || {};
    const status = st.status || "UNKNOWN";
    return c.json(200, {
      name: inst.name || "",
      status: status,
      degraded: status === "DEGRADED" || status === "DOWN",
      since: st.last_status_change || "",
    });
  } catch (err) {
    return c.json(200, { status: "UNKNOWN", degraded: false });
  }
}, $apis.requireRecordAuth());

// POST /api/plaid/disconnect { item_id } -> removes the item at Plaid + locally.
routerAdd("POST", "/api/plaid/disconnect", (c) => {
  try {
    const { plaidCall } = require(`${__hooks}/plaid_lib.js`);
    const info = $apis.requestInfo(c);
    const user = info.authRecord;
    const dao = $app.dao();
    const item = dao.findFirstRecordByFilter(
      "plaid_items", "itemId = {:id} && userId = {:u}", { id: info.data.item_id, u: user.id }
    );
    // Invalidate the access token at Plaid (best-effort — remove locally regardless).
    try { plaidCall("/item/remove", { access_token: item.get("accessToken") }); } catch (e) { /* already gone */ }
    dao.deleteRecord(item);
    return c.json(200, { removed: true });
  } catch (err) {
    return c.json(400, { error: String((err && err.message) || err) });
  }
}, $apis.requireRecordAuth());

// POST /api/plaid/reconnect { itemId } -> { hosted_link_url }  (Link update mode)
routerAdd("POST", "/api/plaid/reconnect", (c) => {
  try {
    const { plaidCall } = require(`${__hooks}/plaid_lib.js`);
    const info = $apis.requestInfo(c);
    const user = info.authRecord;
    const itemId = info.data.item_id;
    const dao = $app.dao();
    const item = dao.findFirstRecordByFilter(
      "plaid_items", "itemId = {:id} && userId = {:u}", { id: itemId, u: user.id }
    );
    const base = $os.getenv("PLAID_REDIRECT_URI") || "https://budget.grotketech.com";
    // Update mode: pass access_token instead of products.
    const data = plaidCall("/link/token/create", {
      user: { client_user_id: user.id },
      client_name: "Budget Tool",
      country_codes: ["US"],
      language: "en",
      access_token: item.get("accessToken"),
      redirect_uri: $os.getenv("PLAID_REDIRECT_URI") || base,
      webhook: base + "/api/plaid/webhook" + (($os.getenv("PLAID_WEBHOOK_SECRET") || "") ? "?key=" + $os.getenv("PLAID_WEBHOOK_SECRET") : ""),
      hosted_link: { completion_redirect_uri: base + "/?plaid=done" },
    });
    // Map so the completion webhook can clear needsReauth for this session.
    dao.saveRecord(new Record(dao.findCollectionByNameOrId("plaid_pending"), {
      linkToken: data.link_token, userId: user.id,
    }));
    return c.json(200, { hosted_link_url: data.hosted_link_url });
  } catch (err) {
    return c.json(400, { error: String((err && err.message) || err) });
  }
}, $apis.requireRecordAuth());

// POST /api/plaid/create-hosted-link -> { hosted_link_url }
// Plaid hosts the whole flow at a URL (no embedded JS / cache issues). The
// public_token comes back via the webhook below.
routerAdd("POST", "/api/plaid/create-hosted-link", (c) => {
  try {
    const { plaidCall } = require(`${__hooks}/plaid_lib.js`);
    const user = $apis.requestInfo(c).authRecord;
    const base = $os.getenv("PLAID_REDIRECT_URI") || "https://budget.grotketech.com";
    const data = plaidCall("/link/token/create", {
      user: { client_user_id: user.id },
      client_name: "Budget Tool",
      products: ["transactions"],
      country_codes: ["US"],
      language: "en",
      // redirect_uri is REQUIRED for OAuth institutions (Chase does app-to-app /
      // mobile OAuth). Without it, Chase's authorize endpoint 500s. Must match a
      // URI registered in the Plaid dashboard.
      redirect_uri: $os.getenv("PLAID_REDIRECT_URI") || base,
      webhook: base + "/api/plaid/webhook" + (($os.getenv("PLAID_WEBHOOK_SECRET") || "") ? "?key=" + $os.getenv("PLAID_WEBHOOK_SECRET") : ""),
      hosted_link: { completion_redirect_uri: base + "/?plaid=done" },
    });
    // Map link_token -> user so the completion webhook knows who connected.
    const dao = $app.dao();
    const rec = new Record(dao.findCollectionByNameOrId("plaid_pending"), {
      linkToken: data.link_token,
      userId: user.id,
    });
    dao.saveRecord(rec);
    return c.json(200, { hosted_link_url: data.hosted_link_url, link_token: data.link_token });
  } catch (err) {
    return c.json(400, { error: String((err && err.message) || err) });
  }
}, $apis.requireRecordAuth());

// POST /api/plaid/webhook  (PUBLIC — Plaid calls this)
// On a completed Hosted Link session, exchange the public token(s), store the
// item(s) for the mapped user, and do the initial transaction sync.
routerAdd("POST", "/api/plaid/webhook", (c) => {
  try {
    // Authenticate the caller. Plaid signs webhooks with an ES256 JWT
    // (Plaid-Verification header), but ECDSA/JWK verification isn't practical in
    // the PocketBase JSVM, and Plaid does NOT support custom webhook_headers
    // (verified: UNKNOWN_FIELDS). So we require a secret in the webhook URL that
    // only our backend sets on the link token, fail-closed (reject if the secret
    // isn't configured), plus the plaid_pending mapping guard below.
    const expected = $os.getenv("PLAID_WEBHOOK_SECRET") || "";
    const provided = ($apis.requestInfo(c).query || {}).key || "";
    if (!expected || provided !== expected) {
      return c.json(401, { error: "unauthorized" });
    }

    const { plaidCall, mapTxn, syncFields } = require(`${__hooks}/plaid_lib.js`);
    const body = $apis.requestInfo(c).data || {};
    // Observability: log receipt (type/code only — never tokens) so a real
    // connection (e.g. Chase) is traceable in `pm2 logs budget-tool-pocketbase`.
    console.log("[plaid] webhook received:", body.webhook_type || "?", body.webhook_code || "?", body.item_id ? "item=" + body.item_id : "");
    const dao = $app.dao();
    const txCol = dao.findCollectionByNameOrId("transactions");

    // Cursor-based sync of one item, deduped by plaidId (added/modified/removed).
    const syncItem = (item, userId) => {
      const findByPlaidId = (pid) => {
        try {
          return dao.findFirstRecordByFilter(
            "transactions", "plaidId = {:p} && userId = {:u}", { p: pid, u: userId }
          );
        } catch (e) { return null; }
      };
      let cursor = item.get("cursor") || "", hasMore = true;
      while (hasMore) {
        const payload = { access_token: item.get("accessToken"), count: 250 };
        if (cursor) payload.cursor = cursor;
        const page = plaidCall("/transactions/sync", payload);
        (page.added || []).forEach((t) => {
          if (!findByPlaidId(t.transaction_id)) dao.saveRecord(new Record(txCol, mapTxn(t, userId)));
        });
        (page.modified || []).forEach((t) => {
          const existing = findByPlaidId(t.transaction_id);
          const r = existing || new Record(txCol);
          const fields = syncFields(mapTxn(t, userId), !!existing);
          for (const k in fields) r.set(k, fields[k]);
          dao.saveRecord(r);
        });
        (page.removed || []).forEach((rm) => {
          const ex = findByPlaidId(rm.transaction_id);
          if (ex) dao.deleteRecord(ex);
        });
        cursor = page.next_cursor;
        hasMore = page.has_more;
      }
      item.set("cursor", cursor);
      dao.saveRecord(item);
    };

    // Hosted Link completed: exchange public token(s), store item(s), sync.
    if (body.webhook_type === "LINK" && body.webhook_code === "SESSION_FINISHED" && body.status === "SUCCESS") {
      let userId = "";
      let pendRec = null;
      try {
        pendRec = dao.findFirstRecordByFilter("plaid_pending", "linkToken = {:lt}", { lt: body.link_token });
        userId = pendRec.get("userId");
      } catch (e) { /* unknown session */ }
      // One-time mapping — remove it now the session is done (connect or reconnect).
      if (pendRec) { try { dao.deleteRecord(pendRec); } catch (e) { /* ignore */ } }
      if (!userId) {
        console.log("[plaid] session finished but no pending mapping for link_token — ignoring");
      }
      if (userId) {
        const itemsCol = dao.findCollectionByNameOrId("plaid_items");
        const tokens = body.public_tokens || [];
        console.log("[plaid] session finished for user", userId, "-", tokens.length, "token(s)");
        tokens.forEach((pt) => {
          try {
            const ex = plaidCall("/item/public_token/exchange", { public_token: pt });
            // Resolve the institution name (e.g. "Chase") for the UI.
            let instName = "";
            try {
              const ig = plaidCall("/item/get", { access_token: ex.access_token });
              const instId = ig.item && ig.item.institution_id;
              if (instId) {
                const inst = plaidCall("/institutions/get_by_id", { institution_id: instId, country_codes: ["US"] });
                instName = (inst.institution && inst.institution.name) || "";
              }
            } catch (e) { /* name is best-effort */ }
            const item = new Record(itemsCol, {
              userId: userId, accessToken: ex.access_token, itemId: ex.item_id, institution: instName, cursor: "",
            });
            dao.saveRecord(item);
            syncItem(item, userId);
            console.log("[plaid] connected item", ex.item_id, instName ? "(" + instName + ")" : "", "and synced");
          } catch (e) {
            console.log("[plaid] exchange/sync failed for a token:", String((e && e.message) || e));
          }
        });
      }
    }

    // Plaid signals new transaction data is ready (esp. large histories like
    // Chase): sync that item so transactions land even after the UI polling ends.
    if (body.webhook_type === "TRANSACTIONS" && body.webhook_code === "SYNC_UPDATES_AVAILABLE") {
      try {
        const item = dao.findFirstRecordByFilter("plaid_items", "itemId = {:id}", { id: body.item_id });
        syncItem(item, item.get("userId"));
        console.log("[plaid] synced updates for item", body.item_id);
      } catch (e) {
        console.log("[plaid] sync-updates failed for item", body.item_id, ":", String((e && e.message) || e));
      }
    }

    // A connection needs re-authentication (password change / expired consent).
    if (body.webhook_type === "ITEM" && body.webhook_code === "ITEM_LOGIN_REQUIRED") {
      try {
        const item = dao.findFirstRecordByFilter("plaid_items", "itemId = {:id}", { id: body.item_id });
        item.set("needsReauth", true);
        dao.saveRecord(item);
      } catch (e) { /* unknown item */ }
    }
    return c.json(200, { received: true });
  } catch (err) {
    console.log("[plaid] webhook handler error:", String((err && err.message) || err));
    return c.json(200, { received: true });
  }
});
