// Product payload validation. Errors are keyed by field path, e.g. "variations.1.sku".
import { Op } from "sequelize";
import { db } from "../../database/index.js";

const STATUSES = ["draft", "live", "archived"];
const str = (v) => (v === undefined || v === null ? "" : String(v).trim());
const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

/**
 * Returns { errors, value }. `productId` (on update) excludes that product's own variants
 * from the shop-wide SKU check. `isCreate` makes stock required on every variant.
 */
export async function validateProduct(body, { productId = null, existingIds = new Set() } = {}) {
  const errors = {};
  const b = body || {};
  const value = {
    name: str(b.name),
    brand: str(b.brand),
    category: str(b.category),
    description: b.description === undefined || b.description === null ? "" : String(b.description).replace(/\r\n/g, "\n"),
    status: STATUSES.includes(b.status) ? b.status : "draft",
    featured: b.featured === true,
    lowStockThreshold: b.lowStockThreshold === undefined ? 3 : Number(b.lowStockThreshold),
    specs: [],
    variations: [],
  };
  if (!value.name) errors.name = "Name is required";
  else if (value.name.length > 100) errors.name = "Keep it under 100 characters";
  if (!value.brand) errors.brand = "Brand is required";
  else if (value.brand.length > 100) errors.brand = "Keep it under 100 characters";
  if (!value.category) errors.category = "Category is required";
  else if (value.category.length > 50) errors.category = "Keep it under 50 characters";
  if (value.description.length > 5000) errors.description = "Keep it under 5000 characters";
  if (b.status !== undefined && !STATUSES.includes(b.status)) errors.status = "Pick a status";
  if (!Number.isInteger(value.lowStockThreshold) || value.lowStockThreshold < 0 || value.lowStockThreshold > 1000) errors.lowStockThreshold = "Use a whole number from 0 to 1000";

  const specs = Array.isArray(b.specs) ? b.specs : [];
  if (specs.length > 30) errors.specs = "No more than 30 specs";
  specs.slice(0, 30).forEach((s, i) => {
    const label = str(s?.label);
    const v = str(s?.value);
    if (!label && !v) return;
    if (!label) errors[`specs.${i}.label`] = "Label is required";
    if (!v) errors[`specs.${i}.value`] = "Value is required";
    if (label.length > 60) errors[`specs.${i}.label`] = "Keep it under 60 characters";
    if (v.length > 200) errors[`specs.${i}.value`] = "Keep it under 200 characters";
    value.specs.push({ label, value: v });
  });

  const vars = Array.isArray(b.variations) ? b.variations : [];
  if (!vars.length) errors.variations = "Add at least one variant";
  if (vars.length > 100) errors.variations = "No more than 100 variants";
  const seen = new Map();
  vars.forEach((v, i) => {
    const p = `variations.${i}`;
    const id = v?.id ? Number(v.id) : null;
    if (id && !existingIds.has(id)) errors[`${p}.id`] = "This variant doesn't belong to the product";
    const out = {
      id,
      name: str(v?.name),
      sku: str(v?.sku),
      price: num(v?.price),
      compareAtPrice: num(v?.compareAtPrice),
      intendedUse: v?.intendedUse ? String(v.intendedUse).trim() : null,
      position: i,
      stock: num(v?.stock),
      version: v?.version === undefined ? null : Number(v.version),
    };
    if (!out.name) errors[`${p}.name`] = "Variant name is required";
    else if (out.name.length > 100) errors[`${p}.name`] = "Keep it under 100 characters";
    if (!out.sku) errors[`${p}.sku`] = "SKU is required";
    else if (out.sku.length > 64) errors[`${p}.sku`] = "Keep it under 64 characters";
    else if (seen.has(out.sku.toLowerCase())) errors[`${p}.sku`] = `SKU ${out.sku} is used twice`;
    else seen.set(out.sku.toLowerCase(), i);
    if (out.price === null || !Number.isFinite(out.price)) errors[`${p}.price`] = "Price is required";
    else if (out.price < 0) errors[`${p}.price`] = "Price must be 0 or more";
    else if (out.price > 1e7) errors[`${p}.price`] = "That price looks too high";
    if (out.compareAtPrice !== null) {
      if (!Number.isFinite(out.compareAtPrice)) errors[`${p}.compareAtPrice`] = "Was price must be a number";
      else if (out.price !== null && out.compareAtPrice <= out.price) errors[`${p}.compareAtPrice`] = "Was price must be more than the price";
    }
    if (!id && (out.stock === null || !Number.isInteger(out.stock) || out.stock < 0)) errors[`${p}.stock`] = "Stock must be a whole number, 0 or more";
    if (out.intendedUse && out.intendedUse.length > 1000) errors[`${p}.intendedUse`] = "Keep it under 1000 characters";
    if (out.price !== null) out.price = Math.round(out.price * 100) / 100;
    if (out.compareAtPrice !== null) out.compareAtPrice = Math.round(out.compareAtPrice * 100) / 100;
    value.variations.push(out);
  });

  // SKUs must be unique across the whole shop.
  const skus = value.variations.map((v) => v.sku).filter(Boolean);
  if (skus.length) {
    const taken = await db.Variations.findAll({
      where: { sku: { [Op.in]: skus }, ...(productId ? { productId: { [Op.ne]: productId } } : {}) },
      include: [{ model: db.Products, as: "product", attributes: ["name"] }],
    });
    for (const t of taken) {
      const i = value.variations.findIndex((v) => v.sku.toLowerCase() === t.sku.toLowerCase());
      if (i >= 0 && !errors[`variations.${i}.sku`]) errors[`variations.${i}.sku`] = `SKU ${t.sku} is already used by ${t.product?.name ?? "another product"} (${t.name})`;
    }
  }
  return { errors, value };
}
