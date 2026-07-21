/// <reference path="../pb_data/types.d.ts" />
// Add provenance + review flags to the existing transactions collection so
// email-captured rows can be marked and surfaced for approval.
//   source:      'email' | 'plaid' | 'csv' | 'manual' (informational)
//   needsReview: true until the user confirms a low-confidence / unverified import
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("transactions");
  collection.schema.addField(new SchemaField({
    "system": false, "id": "txnsourc", "name": "source", "type": "text",
    "required": false, "presentable": false, "unique": false,
    "options": { "min": null, "max": null, "pattern": "" }
  }));
  collection.schema.addField(new SchemaField({
    "system": false, "id": "txnrevw0", "name": "needsReview", "type": "bool",
    "required": false, "presentable": false, "unique": false, "options": {}
  }));
  return dao.saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("transactions");
  collection.schema.removeField("txnsourc");
  collection.schema.removeField("txnrevw0");
  return dao.saveCollection(collection);
})
