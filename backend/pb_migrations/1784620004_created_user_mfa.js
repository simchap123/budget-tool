/// <reference path="../pb_data/types.d.ts" />
// Per-user TOTP 2FA state. Kept in its OWN collection with no API access rules
// (all null) so the secret is never returned in an auth response — only the
// server-side hooks (superuser dao) can read it. `secret`/`pending` hold the
// AES-encrypted base32 TOTP secret (enabled vs mid-enrollment).
migrate((db) => {
  const collection = new Collection({
    "id": "usermfa1234567",
    "name": "user_mfa",
    "type": "base",
    "system": false,
    "schema": [
      { "system": false, "id": "umuserid", "name": "userId", "type": "text", "required": true, "presentable": false, "unique": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "system": false, "id": "umsecret", "name": "secret", "type": "text", "required": false, "presentable": false, "unique": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "system": false, "id": "umpendin", "name": "pending", "type": "text", "required": false, "presentable": false, "unique": false, "options": { "min": null, "max": null, "pattern": "" } },
      { "system": false, "id": "umenabld", "name": "enabled", "type": "bool", "required": false, "presentable": false, "unique": false, "options": {} }
    ],
    "indexes": [
      "CREATE UNIQUE INDEX `idx_user_mfa_user` ON `user_mfa` (`userId`)"
    ],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });
  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  return dao.deleteCollection(dao.findCollectionByNameOrId("usermfa1234567"));
})
