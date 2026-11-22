// Admin product management. Stock is never written here: new variants get an "initial"
// movement, and every later change goes through features/stock (adjust with a reason).
import { Op } from "sequelize";
import { db } from "../../database/index.js";
import { adjustStock } from "../stock/service.js";
import { copyMedia, deleteMediaFiles, mediaForVariations } from "../media/service.js";
import { logActivity } from "../activity/service.js";
import { ConflictError, NotFoundError, ValidationError, VersionConflictError } from "../http.js";
import { validateProduct } from "./validate.js";

const PRODUCT_CONFLICT = "Someone else saved this product since you opened it. Reload to see their changes.";

const activeVariations = { model: db.Variations, as: "variations", where: { archivedAt: null }, required: false };

/** Variation ids that appear on any order line. */
export async function orderedVariationIds(variationIds, { transaction } = {}) {
  if (!variationIds.length) return new Set();
  const rows = await db.OrderItem.findAll({ where: { variationId: variationIds }, attributes: ["variationId"], group: ["variationId"], transaction });
  return new Set(rows.map((r) => r.variationId));
}

const totals = (vars) => {
  const prices = vars.map((v) => Number(v.price));
  return {
    variantCount: vars.length,
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
    totalStock: vars.reduce((s, v) => s + v.stock, 0),
  };
};

export const stockFlag = (vars, threshold) =>
  vars.some((v) => v.stock === 0) ? "out" : vars.some((v) => v.stock > 0 && v.stock <= threshold) ? "low" : "in";

/** GET /admin/products: filter, sort and page. The catalogue is small, so this runs in memory. */
export async function listProducts({ q = "", status = "", category = "", brand = "", stock = "", sort = "updated", page = 1, pageSize = 25 }) {
  const where = {};
  if (["draft", "live", "archived"].includes(status)) where.status = status;
  if (category) where.category = category;
  if (brand) where.brand = brand;
  const rows = await db.Products.findAll({ where, include: [{ ...activeVariations, separate: true, order: [["position", "ASC"], ["id", "ASC"]] }], order: [["updatedAt", "DESC"], ["id", "DESC"]] });
  const needle = String(q).trim().toLowerCase();
  let list = rows.filter((p) => {
    if (needle && !(`${p.name} ${p.brand}`.toLowerCase().includes(needle) || p.variations.some((v) => v.sku.toLowerCase().includes(needle)))) return false;
    if (stock === "low") return p.variations.some((v) => v.stock > 0 && v.stock <= p.lowStockThreshold);
    if (stock === "out") return p.variations.some((v) => v.stock === 0);
    return true;
  });
  if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "stock") list.sort((a, b) => totals(a.variations).totalStock - totals(b.variations).totalStock);
  const total = list.length;
  list = list.slice((page - 1) * pageSize, page * pageSize);
  const media = await mediaForVariations(list.flatMap((p) => p.variations.map((v) => v.id)));
  return {
    total,
    items: list.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      status: p.status,
      featured: p.featured,
      lowStockThreshold: p.lowStockThreshold,
      updatedAt: p.updatedAt,
      version: p.version,
      stockFlag: stockFlag(p.variations, p.lowStockThreshold),
      thumb: p.variations.map((v) => media.get(v.id)?.[0]?.url).find(Boolean) || null,
      variations: p.variations.map((v) => ({ id: v.id, name: v.name, sku: v.sku, price: Number(v.price), stock: v.stock, version: v.version })),
      ...totals(p.variations),
    })),
  };
}

/** Full product for the editor. */
export async function getProduct(id) {
  const p = await db.Products.findByPk(id, { include: [{ ...activeVariations, separate: true, order: [["position", "ASC"], ["id", "ASC"]] }] });
  if (!p) throw new NotFoundError("Product not found.");
  const ids = p.variations.map((v) => v.id);
  const [ordered, media, archivedOrdered] = await Promise.all([
    orderedVariationIds(ids),
    mediaForVariations(ids),
    db.Variations.count({ where: { productId: id, archivedAt: { [Op.ne]: null } } }),
  ]);
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    description: p.description || "",
    status: p.status,
    featured: p.featured,
    specs: Array.isArray(p.specs) ? p.specs : [],
    lowStockThreshold: p.lowStockThreshold,
    version: p.version,
    updatedAt: p.updatedAt,
    ordered: ordered.size > 0 || archivedOrdered > 0,
    variations: p.variations.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: Number(v.price),
      compareAtPrice: v.compareAtPrice === null ? null : Number(v.compareAtPrice),
      stock: v.stock,
      intendedUse: v.intendedUse || "",
      position: v.position,
      version: v.version,
      ordered: ordered.has(v.id),
      media: media.get(v.id) || [],
    })),
  };
}

const productFields = (v) => ({
  name: v.name,
  brand: v.brand,
  category: v.category,
  description: v.description,
  status: v.status,
  featured: v.featured,
  specs: v.specs,
  lowStockThreshold: v.lowStockThreshold,
});

const variationFields = (v) => ({ name: v.name, sku: v.sku, price: v.price, compareAtPrice: v.compareAtPrice, intendedUse: v.intendedUse, position: v.position });

async function createVariation(productId, v, actor, transaction) {
  const row = await db.Variations.create({ productId, ...variationFields(v), stock: 0 }, { transaction });
  // Starting stock is recorded like any other stock change.
  await adjustStock({ variationId: row.id, delta: v.stock ?? 0, reason: "initial", note: "Starting stock", actor }, { transaction });
  return row;
}

export async function createProduct(body, actor) {
  const { errors, value } = await validateProduct(body);
  if (Object.keys(errors).length) throw new ValidationError(errors);
  const id = await db.sequelize.transaction(async (transaction) => {
    const p = await db.Products.create(productFields(value), { transaction });
    for (const v of value.variations) await createVariation(p.id, v, actor, transaction);
    return p.id;
  });
  await logActivity({ actor, action: "product.create", entity: "product", entityId: id, summary: `Created product ${value.name}` });
  return getProduct(id);
}

/** Remove variants: archived if ever ordered, otherwise deleted (with their cart lines and photos). */
async function removeVariations(rows, transaction) {
  const ordered = await orderedVariationIds(rows.map((r) => r.id), { transaction });
  const toDelete = rows.filter((r) => !ordered.has(r.id)).map((r) => r.id);
  const toArchive = rows.filter((r) => ordered.has(r.id)).map((r) => r.id);
  if (toArchive.length) await db.Variations.update({ archivedAt: new Date() }, { where: { id: toArchive }, transaction });
  if (toDelete.length) {
    await db.Cart.destroy({ where: { variationId: toDelete }, transaction });
    await deleteMediaFiles(toDelete);
    await db.Variations.destroy({ where: { id: toDelete }, transaction });
  }
  // Archived variants can't be bought any more either.
  if (toArchive.length) await db.Cart.destroy({ where: { variationId: toArchive }, transaction });
  return { deleted: toDelete.length, archived: toArchive.length };
}

export async function updateProduct(id, body, actor) {
  const existing = await db.Products.findByPk(id, { include: [activeVariations] });
  if (!existing) throw new NotFoundError("Product not found.");
  const existingIds = new Set(existing.variations.map((v) => v.id));
  const { errors, value } = await validateProduct(body, { productId: id, existingIds });
  if (Object.keys(errors).length) throw new ValidationError(errors);
  if (Number(body?.version) !== existing.version) throw new VersionConflictError(PRODUCT_CONFLICT);

  await db.sequelize.transaction(async (transaction) => {
    const p = await db.Products.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (p.version !== Number(body.version)) throw new VersionConflictError(PRODUCT_CONFLICT);
    // A quick price edit from the list bumps the variant's version: don't overwrite it.
    for (const v of value.variations.filter((x) => x.id && x.version !== null)) {
      const cur = existing.variations.find((e) => e.id === v.id);
      if (cur && cur.version !== v.version) throw new VersionConflictError(PRODUCT_CONFLICT);
    }
    await p.update({ ...productFields(value), version: p.version + 1 }, { transaction });
    const keep = new Set(value.variations.filter((v) => v.id).map((v) => v.id));
    await removeVariations(existing.variations.filter((v) => !keep.has(v.id)), transaction);
    // Free up SKUs first so two variants can swap SKUs in one save.
    for (const v of value.variations.filter((x) => x.id)) {
      await db.Variations.update({ sku: `__tmp_${v.id}_${Date.now()}` }, { where: { id: v.id }, transaction });
    }
    for (const v of value.variations) {
      if (v.id) await db.Variations.update({ ...variationFields(v), version: db.sequelize.literal("version + 1") }, { where: { id: v.id }, transaction });
      else await createVariation(id, v, actor, transaction);
    }
  });
  await logActivity({ actor, action: "product.update", entity: "product", entityId: id, summary: `${value.status === "archived" && existing.status !== "archived" ? "Archived" : "Updated"} product ${value.name}` });
  return getProduct(id);
}

export async function deleteProduct(id, actor) {
  const p = await db.Products.findByPk(id, { include: [{ model: db.Variations, as: "variations" }] });
  if (!p) throw new NotFoundError("Product not found.");
  const ids = p.variations.map((v) => v.id);
  if ((await orderedVariationIds(ids)).size) throw new ConflictError("This product has orders. Archive it instead.", { code: "has_orders" });
  await db.sequelize.transaction(async (transaction) => {
    await db.Cart.destroy({ where: { variationId: ids }, transaction });
    await deleteMediaFiles(ids);
    await p.destroy({ transaction });
  });
  await logActivity({ actor, action: "product.delete", entity: "product", entityId: id, summary: `Deleted product ${p.name}` });
}

async function freeSku(base, transaction) {
  for (let n = 1; n < 100; n++) {
    const sku = `${base}-COPY${n === 1 ? "" : n}`;
    if (!(await db.Variations.findOne({ where: { sku }, transaction }))) return sku;
  }
  return `${base}-COPY-${Date.now()}`;
}

export async function duplicateProduct(id, actor) {
  const src = await getProduct(id);
  const pairs = [];
  const newId = await db.sequelize.transaction(async (transaction) => {
    const p = await db.Products.create({ ...productFields(src), name: `${src.name} (copy)`.slice(0, 100), status: "draft", featured: false }, { transaction });
    for (const v of src.variations) {
      const row = await createVariation(p.id, { ...v, sku: await freeSku(v.sku, transaction), stock: 0 }, actor, transaction);
      pairs.push([v.id, row.id]);
    }
    return p.id;
  });
  for (const [from, to] of pairs) await copyMedia(from, to);
  await logActivity({ actor, action: "product.duplicate", entity: "product", entityId: newId, summary: `Duplicated product ${src.name}` });
  return { id: newId };
}

/** Bulk actions from the products list. */
export async function bulkProducts({ ids, action, value }, actor) {
  const list = (Array.isArray(ids) ? ids : []).map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (!list.length) throw new ValidationError({ ids: "Select at least one product" });
  const result = { updated: 0, deleted: 0, archivedInstead: 0 };
  if (action === "status") {
    if (!["draft", "live", "archived"].includes(value)) throw new ValidationError({ value: "Pick a status" });
    [result.updated] = await db.Products.update({ status: value, version: db.sequelize.literal("version + 1") }, { where: { id: list } });
  } else if (action === "category" || action === "brand") {
    const v = String(value || "").trim();
    if (!v) throw new ValidationError({ value: `Enter a ${action}` });
    const rows = await db.Products.findAll({ where: { id: list } });
    for (const p of rows) await p.update({ [action]: v, version: p.version + 1 });
    result.updated = rows.length;
  } else if (action === "delete") {
    for (const id of list) {
      try {
        await deleteProduct(id, actor);
        result.deleted++;
      } catch (error) {
        if (error?.extra?.code !== "has_orders") throw error;
        await db.Products.update({ status: "archived", version: db.sequelize.literal("version + 1") }, { where: { id } });
        result.archivedInstead++;
      }
    }
  } else throw new ValidationError({ action: "Unknown action" });
  await logActivity({ actor, action: `product.bulk.${action}`, entity: "product", summary: `Bulk ${action}${value ? ` → ${value}` : ""} on ${list.length} product${list.length === 1 ? "" : "s"}` });
  return result;
}

/** Quick price edit from the list. */
export async function patchVariation(id, body, actor) {
  const v = await db.Variations.findByPk(id, { include: [{ model: db.Products, as: "product", attributes: ["name"] }] });
  if (!v) throw new NotFoundError("Variant not found.");
  if (Number(body?.version) !== v.version) throw new VersionConflictError("Someone else changed this variant. Reload to see the latest.");
  const price = body.price === undefined ? Number(v.price) : Number(body.price);
  const cmp = body.compareAtPrice === undefined ? (v.compareAtPrice === null ? null : Number(v.compareAtPrice)) : body.compareAtPrice === null || body.compareAtPrice === "" ? null : Number(body.compareAtPrice);
  const errors = {};
  if (!Number.isFinite(price) || price < 0) errors.price = "Price must be 0 or more";
  if (cmp !== null && (!Number.isFinite(cmp) || cmp <= price)) errors.compareAtPrice = "Was price must be more than the price";
  if (Object.keys(errors).length) throw new ValidationError(errors);
  await v.update({ price, compareAtPrice: cmp, version: v.version + 1 });
  await logActivity({ actor, action: "variation.price", entity: "variation", entityId: id, summary: `Set price of ${v.product?.name} (${v.name}) to RM ${price.toFixed(2)}` });
  return { id: v.id, price, compareAtPrice: cmp, version: v.version };
}
