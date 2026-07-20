/// <reference path="../pb_data/types.d.ts" />
// Vendors: the normalized-merchant layer. Each transaction belongs to a vendor
// (matched on the same merchant key the categorizer uses) and a vendor carries a
// default category, so re-pointing a vendor recategorizes all its transactions.
migrate((db) => {
  const collection = new Collection({
    "id": "vendors12345678",
    "name": "vendors",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false, "id": "vuserid", "name": "userId", "type": "text",
        "required": true, "presentable": false, "unique": false,
        "options": { "min": null, "max": null, "pattern": "" }
      },
      {
        "system": false, "id": "vname00", "name": "name", "type": "text",
        "required": true, "presentable": true, "unique": false,
        "options": { "min": null, "max": null, "pattern": "" }
      },
      {
        "system": false, "id": "vmatch0", "name": "matchKey", "type": "text",
        "required": true, "presentable": false, "unique": false,
        "options": { "min": null, "max": null, "pattern": "" }
      },
      {
        "system": false, "id": "vcat000", "name": "category", "type": "text",
        "required": false, "presentable": false, "unique": false,
        "options": { "min": null, "max": null, "pattern": "" }
      },
      {
        "system": false, "id": "vcount0", "name": "count", "type": "number",
        "required": false, "presentable": false, "unique": false,
        "options": { "min": null, "max": null, "noDecimal": false }
      }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_vendor_userkey` ON `vendors` (`userId`, `matchKey`)"
    ],
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
  return dao.deleteCollection(dao.findCollectionByNameOrId("vendors12345678"));
})
