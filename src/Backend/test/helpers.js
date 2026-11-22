// Shared helpers for integration tests that run against the real test MySQL database.
import express from "express";
import { db } from "../database/index.js";

export const ADMIN = { id: 1, category: "Admin", username: "Admin", isActive: true };
export const CUSTOMER = { id: 2, category: "Customer", username: "ria", isActive: true };

/**
 * An app with JSON parsing, a fake session user and `router` mounted at `mount`.
 * `user` may be an object, null (signed out) or a function of the request.
 */
export function appAs(router, user = ADMIN, mount = "/") {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const u = typeof user === "function" ? user(req) : user;
    req.session = u ? { user: u } : {};
    next();
  });
  app.use(mount, router);
  return app;
}

/** Empty the given tables (model names), ignoring FK order. */
export async function resetTables(...models) {
  const s = db.sequelize;
  await s.query("SET FOREIGN_KEY_CHECKS = 0");
  try {
    for (const m of models) await s.query(`TRUNCATE TABLE \`${db[m].getTableName()}\``);
  } finally {
    await s.query("SET FOREIGN_KEY_CHECKS = 1");
  }
}

let seq = 0;
const uniq = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

export async function makeAccount(overrides = {}) {
  const u = uniq();
  return db.Account.create({
    category: "Customer",
    first_name: "Test",
    last_name: "User",
    username: `user${u}`,
    email: `user${u}@example.test`,
    phone_number: "0123456789",
    password: "x".repeat(60),
    ...overrides,
  });
}

/** Product with variations. Each variation: { name, sku, price, stock }. */
export async function makeProduct({ variations = [{ name: "Red", sku: `SKU-${uniq()}`, price: 389, stock: 4 }], ...fields } = {}) {
  const product = await db.Products.create({ name: "DMR Vault", brand: "DMR", category: "Pedals", description: "", ...fields });
  const rows = [];
  for (const [i, v] of variations.entries()) {
    rows.push(
      await db.Variations.create({
        productId: product.id,
        name: v.name ?? `V${i}`,
        sku: v.sku ?? `SKU-${uniq()}`,
        price: v.price ?? 100,
        stock: v.stock ?? 1,
        intendedUse: v.intendedUse ?? null,
        image_folder_path: v.image_folder_path ?? `images/product_images/${product.id}`,
        ...(v.extra || {}),
      })
    );
  }
  return { product, variations: rows };
}
