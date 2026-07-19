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
    const data = plaidCall("/link/token/create", {
      user: { client_user_id: user.id },
      client_name: "Budget Tool",
      products: ["transactions"],
      country_codes: ["US"],
      language: "en",
    });
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
    const { plaidCall, mapTxn } = require(`${__hooks}/plaid_lib.js`);
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

    for (const item of items) {
      let cursor = item.get("cursor") || "";
      let hasMore = true;

      while (hasMore) {
        const payload = { access_token: item.get("accessToken"), count: 250 };
        if (cursor) payload.cursor = cursor;
        const page = plaidCall("/transactions/sync", payload);

        (page.added || []).forEach((t) => {
          const rec = new Record(txCollection, mapTxn(t, user.id));
          dao.saveRecord(rec);
          added++;
        });
        (page.modified || []).forEach((t) => {
          const rec = findByPlaidId(t.transaction_id) || new Record(txCollection);
          const m = mapTxn(t, user.id);
          for (const k in m) rec.set(k, m[k]);
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
      dao.saveRecord(item);
    }

    return c.json(200, { added: added, modified: modified, removed: removed });
  } catch (err) {
    return c.json(400, { error: String((err && err.message) || err) });
  }
}, $apis.requireRecordAuth());
