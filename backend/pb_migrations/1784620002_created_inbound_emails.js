/// <reference path="../pb_data/types.d.ts" />
// Async queue + audit trail for inbound transaction-alert emails. The webhook
// stores each accepted email here as `pending`; a cron extracts it into a
// transaction, then clears `raw` and marks it `done`. `messageId` is unique so a
// replayed email can never create a duplicate transaction.
migrate((db) => {
  const collection = new Collection({
    "id": "inboundemails12",
    "name": "inbound_emails",
    "type": "base",
    "system": false,
    "schema": [
      { "system": false, "id": "inuserid", "name": "userId", "type": "text", "required": true, "presentable": false, "unique": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "system": false, "id": "inmsgid0", "name": "messageId", "type": "text", "required": true, "presentable": false, "unique": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "system": false, "id": "infrom00", "name": "fromAddr", "type": "text", "required": false, "presentable": false, "unique": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "system": false, "id": "insubjct", "name": "subject", "type": "text", "required": false, "presentable": false, "unique": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "system": false, "id": "inraw000", "name": "raw", "type": "text", "required": false, "presentable": false, "unique": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "system": false, "id": "inauth00", "name": "auth", "type": "json", "required": false, "presentable": false, "unique": false, "options": { "maxSize": 200000 } },
      { "system": false, "id": "instatus", "name": "status", "type": "text", "required": false, "presentable": false, "unique": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "system": false, "id": "inerror0", "name": "error", "type": "text", "required": false, "presentable": false, "unique": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "system": false, "id": "inconfid", "name": "confidence", "type": "number", "required": false, "presentable": false, "unique": false, "options": { "min": null, "max": null, "noDecimal": false } },
      { "system": false, "id": "intxnid0", "name": "transactionId", "type": "text", "required": false, "presentable": false, "unique": false, "options": { "min": null, "max": null, "pattern": "" } }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_inbound_msgid` ON `inbound_emails` (`messageId`)",
      "CREATE INDEX `idx_inbound_status` ON `inbound_emails` (`status`)"
    ],
    "listRule": "userId = @request.auth.id",
    "viewRule": "userId = @request.auth.id",
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });
  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  return dao.deleteCollection(dao.findCollectionByNameOrId("inboundemails12"));
})
