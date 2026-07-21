/// <reference path="../pb_data/types.d.ts" />
// Per-user private inbound email address. The user forwards bank / credit-card
// transaction alerts to `u_<token>@transactions.grotketech.com`; the token maps
// the incoming mail back to this user. Rotatable and disable-able.
migrate((db) => {
  const collection = new Collection({
    "id": "emailinboxes123",
    "name": "email_inboxes",
    "type": "base",
    "system": false,
    "schema": [
      { "system": false, "id": "eiuserid", "name": "userId", "type": "text", "required": true, "presentable": false, "unique": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "system": false, "id": "eitoken0", "name": "token", "type": "text", "required": true, "presentable": true, "unique": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "system": false, "id": "eienabld", "name": "enabled", "type": "bool", "required": false, "presentable": false, "unique": false, "options": {} }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_email_inbox_token` ON `email_inboxes` (`token`)",
      "CREATE UNIQUE INDEX `idx_email_inbox_user` ON `email_inboxes` (`userId`)"
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
  return dao.deleteCollection(dao.findCollectionByNameOrId("emailinboxes123"));
})
