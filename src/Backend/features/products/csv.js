// Product CSV: one row per variant. Import matches rows to variants by SKU.
//   SKU exists             -> update that variant (and its product's fields)
//   new SKU + product_id   -> add a variant to that product
//   new SKU, no product_id -> rows grouped by product_name + brand become new DRAFT products
// Variants missing from the file are left alone. Stock differences are recorded as "import".
// stock_at_export is the stock when the file was exported: if it has moved since (a sale, a
// checkout hold), that line's stock is not applied, so an old file can't undo sales.
import { db } from "../../database/index.js";
import { adjustStock } from "../stock/service.js";
import { logActivity } from "../activity/service.js";
import { ValidationError } from "../http.js";
import { parseCsv } from "../csv.js";

export const COLUMNS = ["product_id", "product_name", "brand", "category", "status", "featured", "description", "variant_name", "sku", "price", "compare_at_price", "stock", "stock_at_export", "intended_use"];
const STATUSES = ["draft", "live", "archived"];

export async function exportRows() {
  const products = await db.Products.findAll({
    include: [{ model: db.Variations, as: "variations", where: { archivedAt: null }, required: false }],
    order: [["id", "ASC"], [{ model: db.Variations, as: "variations" }, "position", "ASC"], [{ model: db.Variations, as: "variations" }, "id", "ASC"]],
  });
  const rows = [COLUMNS];
  for (const p of products) {
    for (const v of p.variations) {
      rows.push([p.id, p.name, p.brand, p.category, p.status, p.featured ? "yes" : "no", p.description || "", v.name, v.sku, Number(v.price).toFixed(2), v.compareAtPrice === null ? "" : Number(v.compareAtPrice).toFixed(2), v.stock, v.stock, v.intendedUse || ""]);
    }
  }
  return rows;
}

const BOOL = { yes: true, y: true, true: true, 1: true, no: false, n: false, false: false, 0: false };
const money = (s) => (s === "" ? null : /^-?\d+(\.\d{1,2})?$/.test(s) ? Number(s) : NaN);
const sameMoney = (a, b) => (a === null ? null : Number(a)) === (b === null ? null : Number(b));

/** Work out what an import would do, without changing anything. */
export async function planImport(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new ValidationError({ file: "The file has no rows" }, "The file has no rows.");
  const header = rows[0].map((h) => h.trim().toLowerCase());
  for (const required of ["sku", "variant_name", "price"]) {
    if (!header.includes(required)) throw new ValidationError({ file: `Missing column ${required}` }, `Missing column "${required}". Export a CSV first to get the right columns.`);
  }
  const at = (r, name) => {
    const i = header.indexOf(name);
    // Our export prefixes text starting with = + - @ with an apostrophe (spreadsheet safety).
    return i < 0 ? undefined : String(r[i] ?? "").trim().replace(/^'(?=[=+\-@])/, "");
  };
  const has = (name) => header.includes(name);

  const skus = rows.slice(1).map((r) => at(r, "sku")).filter(Boolean);
  const existing = new Map(
    (await db.Variations.findAll({ where: { sku: skus }, include: [{ model: db.Products, as: "product" }] })).map((v) => [v.sku.toLowerCase(), v])
  );
  const productIds = [...new Set(rows.slice(1).map((r) => Number(at(r, "product_id"))).filter((n) => Number.isInteger(n) && n > 0))];
  const products = new Map((await db.Products.findAll({ where: { id: productIds } })).map((p) => [p.id, p]));

  const lines = [];
  const seen = new Set();
  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const fail = (message) => lines.push({ line, action: "error", sku: at(r, "sku") || "", message: `Line ${line}: ${message}` });
    const sku = at(r, "sku");
    if (!sku) return fail("sku is required");
    if (seen.has(sku.toLowerCase())) return fail(`SKU ${sku} appears twice in the file`);
    seen.add(sku.toLowerCase());
    const price = money(at(r, "price") ?? "");
    if (price === null || Number.isNaN(price) || price < 0) return fail("price must be a number");
    const cmpRaw = at(r, "compare_at_price") ?? "";
    const cmp = money(cmpRaw);
    if (Number.isNaN(cmp)) return fail("compare_at_price must be a number");
    if (cmp !== null && cmp <= price) return fail("compare_at_price must be more than the price");
    const stockRaw = at(r, "stock") ?? "";
    const stock = stockRaw === "" ? null : /^\d+$/.test(stockRaw) ? Number(stockRaw) : NaN;
    if (Number.isNaN(stock)) return fail("stock must be a whole number, 0 or more");
    const status = at(r, "status") ?? "";
    if (status && !STATUSES.includes(status.toLowerCase())) return fail("status must be draft, live or archived");
    const featuredRaw = (at(r, "featured") ?? "").toLowerCase();
    if (featuredRaw && !(featuredRaw in BOOL)) return fail("featured must be yes or no");
    const name = at(r, "variant_name");
    if (!name) return fail("variant_name is required");
    for (const [col, max] of [["product_name", 100], ["brand", 100], ["category", 50], ["variant_name", 100], ["sku", 64], ["intended_use", 1000], ["description", 5000]]) {
      if ((at(r, col) || "").length > max) return fail(`${col} must be ${max} characters or fewer`);
    }
    const sawRaw = at(r, "stock_at_export") ?? "";
    const stockAtExport = sawRaw === "" ? null : /^\d+$/.test(sawRaw) ? Number(sawRaw) : NaN;
    if (Number.isNaN(stockAtExport)) return fail("stock_at_export must be a whole number");
    const pidRaw = at(r, "product_id") ?? "";
    const pid = pidRaw ? Number(pidRaw) : null;
    if (pidRaw && !(Number.isInteger(pid) && pid > 0)) return fail("product_id must be a number");

    const variant = { name, sku, price, compareAtPrice: cmp, stock, stockAtExport, intendedUse: has("intended_use") ? at(r, "intended_use") || null : undefined };
    const product = {
      name: at(r, "product_name") || undefined,
      brand: at(r, "brand") || undefined,
      category: at(r, "category") || undefined,
      status: status ? status.toLowerCase() : undefined,
      featured: featuredRaw ? BOOL[featuredRaw] : undefined,
      description: has("description") ? at(r, "description") : undefined,
    };

    const ex = existing.get(sku.toLowerCase());
    if (ex) {
      if (pid && pid !== ex.productId) return fail(`SKU ${sku} belongs to product ${ex.productId}, not ${pid}`);
      const changes = [];
      if (variant.name !== ex.name) changes.push("variant name");
      if (!sameMoney(variant.price, ex.price)) changes.push("price");
      if (!sameMoney(variant.compareAtPrice, ex.compareAtPrice)) changes.push("was price");
      if (variant.intendedUse !== undefined && (variant.intendedUse || null) !== (ex.intendedUse || null)) changes.push("intended use");
      let stockNote = null;
      if (stock !== null && stockAtExport !== null && stockAtExport !== ex.stock) {
        stockNote = `stock not changed: it moved from ${stockAtExport} to ${ex.stock} since the export`;
        variant.stock = null;
      } else if (stock !== null && stock !== ex.stock) changes.push(`stock ${ex.stock} → ${stock}`);
      const p = ex.product;
      for (const [k, labelText] of [["name", "product name"], ["brand", "brand"], ["category", "category"], ["status", "status"], ["featured", "featured"], ["description", "description"]]) {
        if (product[k] !== undefined && product[k] !== (k === "description" ? p[k] || "" : p[k])) changes.push(labelText);
      }
      lines.push({ line, sku, action: changes.length ? "update" : "unchanged", changes, message: stockNote || undefined, expectedStock: ex.stock, variationId: ex.id, productId: ex.productId, variant, product });
    } else if (pid) {
      if (!products.has(pid)) return fail(`product ${pid} doesn't exist`);
      lines.push({ line, sku, action: "create_variant", productId: pid, variant, product: {} });
    } else {
      if (!product.name || !product.brand || !product.category) return fail("a new product needs product_name, brand and category");
      lines.push({ line, sku, action: "create_product", groupKey: `${product.name.toLowerCase()}|${product.brand.toLowerCase()}`, variant, product });
    }
  });

  const count = (a) => lines.filter((l) => l.action === a).length;
  const newProducts = new Set(lines.filter((l) => l.action === "create_product").map((l) => l.groupKey)).size;
  return {
    lines,
    summary: { update: count("update"), unchanged: count("unchanged"), createVariant: count("create_variant"), createProduct: count("create_product"), newProducts, error: count("error"), applicable: count("update") + count("create_variant") + count("create_product") },
  };
}

/** Apply every non-error line of the plan in one transaction. */
export async function applyImport(text, actor) {
  const plan = await planImport(text);
  await db.sequelize.transaction(async (transaction) => {
    const created = new Map();
    for (const l of plan.lines) {
      if (l.action === "update") {
        const v = l.variant;
        await db.Variations.update(
          { name: v.name, price: v.price, compareAtPrice: v.compareAtPrice, ...(v.intendedUse !== undefined ? { intendedUse: v.intendedUse } : {}), version: db.sequelize.literal("version + 1") },
          { where: { id: l.variationId }, transaction }
        );
        const pf = Object.fromEntries(Object.entries(l.product).filter(([, x]) => x !== undefined));
        if (Object.keys(pf).length) {
          const p = await db.Products.findByPk(l.productId, { transaction });
          await p.update({ ...pf, version: p.version + 1 }, { transaction });
        }
        if (v.stock !== null) {
          const cur = await db.Variations.findByPk(l.variationId, { transaction, lock: transaction.LOCK.UPDATE });
          // Only apply when stock is still what the plan saw (and, if given, what was exported).
          const expected = v.stockAtExport ?? l.expectedStock;
          if (cur.stock === expected && cur.stock !== v.stock) await adjustStock({ variationId: l.variationId, delta: v.stock - cur.stock, reason: "import", note: "CSV import", actor }, { transaction });
        }
      } else if (l.action === "create_variant" || l.action === "create_product") {
        let productId = l.productId;
        if (l.action === "create_product") {
          productId = created.get(l.groupKey);
          if (!productId) {
            const p = await db.Products.create(
              { name: l.product.name, brand: l.product.brand, category: l.product.category, description: l.product.description || "", featured: !!l.product.featured, status: "draft" },
              { transaction }
            );
            productId = p.id;
            created.set(l.groupKey, productId);
          }
        }
        const position = ((await db.Variations.max("position", { where: { productId }, transaction })) ?? -1) + 1;
        const row = await db.Variations.create(
          { productId, name: l.variant.name, sku: l.variant.sku, price: l.variant.price, compareAtPrice: l.variant.compareAtPrice, intendedUse: l.variant.intendedUse ?? null, position, stock: 0 },
          { transaction }
        );
        await adjustStock({ variationId: row.id, delta: l.variant.stock ?? 0, reason: "import", note: "CSV import", actor }, { transaction });
      }
    }
  });
  const s = plan.summary;
  await logActivity({ actor, action: "product.import", entity: "product", summary: `CSV import: ${s.update} updated, ${s.createVariant + s.createProduct} new variants, ${s.newProducts} new products, ${s.error} skipped` });
  return plan;
}
