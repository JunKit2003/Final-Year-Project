// Demo catalogue for local runs and tests: one product per bundled image folder
// (images/product_images/<id>/<sku>/), only when the products table is empty.
//   npm run seed:demo
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";

const CATALOGUE = [
  ["Deity", "Grips"], ["Industry Nine", "Wheels"], ["Michelin", "Tyres"], ["OneUp Components", "Dropper posts"],
  ["CushCore", "Tyre inserts"], ["Peaty's", "Maintenance"], ["Trek", "Accessories"], ["DMR", "Pedals"],
];

export async function seedDemo(db, { imagesRoot = process.env.IMAGES_ROOT || "images", limit = Infinity } = {}) {
  if ((await db.Products.count()) > 0) return { created: 0 };
  const root = join(imagesRoot, "product_images");
  if (!existsSync(root)) return { created: 0 };
  const ids = readdirSync(root).filter((d) => /^\d+$/.test(d)).map(Number).sort((a, b) => a - b).slice(0, limit);
  let created = 0;
  for (const [n, id] of ids.entries()) {
    const skus = readdirSync(join(root, String(id)), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    if (!skus.length) continue;
    const [brand, category] = CATALOGUE[n % CATALOGUE.length];
    await db.Products.create({ id, name: `${brand} ${category.replace(/s$/, "")} ${id}`, brand, category, description: `Demo ${category.toLowerCase()} from ${brand}.` });
    for (const [i, sku] of skus.entries()) {
      await db.Variations.create({
        productId: id, name: skus.length > 1 ? `Option ${i + 1}` : "Standard", sku,
        price: 49 + ((id * 37 + i * 11) % 900), stock: (id + i) % 7, image_folder_path: `images/product_images/${id}`,
      });
    }
    created++;
  }
  return { created };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { db } = await import("../database/index.js");
  const result = await seedDemo(db);
  console.log(`Seeded ${result.created} demo products.`);
  await db.sequelize.close();
}
