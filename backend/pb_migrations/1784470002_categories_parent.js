/// <reference path="../pb_data/types.d.ts" />
// Add an optional `parent` to categories so a category can nest under a broader
// one (Food › Grocery, Food › Takeout) for roll-up reporting.
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("2mkmee6ei3tpfub");
  collection.schema.addField(new SchemaField({
    "system": false, "id": "cparent", "name": "parent", "type": "text",
    "required": false, "presentable": false, "unique": false,
    "options": { "min": null, "max": null, "pattern": "" }
  }));
  return dao.saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("2mkmee6ei3tpfub");
  collection.schema.removeField("cparent");
  return dao.saveCollection(collection);
})
