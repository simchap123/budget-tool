/// <reference path="../pb_data/types.d.ts" />
// Debts / loans the user is paying down (mortgage, credit cards, student loans,
// car loans). Payments auto-apply by linking a debt to a vendor merchant key:
// every transaction rolling up to that key counts toward the balance. Balance
// tracking only (no interest math) per the product decision.
migrate((db) => {
  const collection = new Collection({
    "id": "debts1234567890",
    "name": "debts",
    "type": "base",
    "system": false,
    "schema": [
      { "system": false, "id": "duserid", "name": "userId", "type": "text", "required": true, "presentable": false, "unique": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "system": false, "id": "dname00", "name": "name", "type": "text", "required": true, "presentable": true, "unique": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "system": false, "id": "dtype00", "name": "type", "type": "text", "required": false, "presentable": false, "unique": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "system": false, "id": "dorigba", "name": "originalBalance", "type": "number", "required": true, "presentable": false, "unique": false, "options": { "min": null, "max": null, "noDecimal": false } },
      { "system": false, "id": "dmatch0", "name": "matchKey", "type": "text", "required": false, "presentable": false, "unique": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "system": false, "id": "dstart0", "name": "startDate", "type": "text", "required": false, "presentable": false, "unique": false, "options": { "min": null, "max": null, "pattern": "" } }
    ],
    "indexes": [],
    "listRule": "userId = @request.auth.id",
    "viewRule": "userId = @request.auth.id",
    "createRule": "userId = @request.auth.id",
    "updateRule": "userId = @request.auth.id",
    "deleteRule": "userId = @request.auth.id",
    "options": {}
  });
  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  return dao.deleteCollection(dao.findCollectionByNameOrId("debts1234567890"));
})
