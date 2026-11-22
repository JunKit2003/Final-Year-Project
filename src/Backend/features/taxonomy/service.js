// Categories and brands are plain text on products. Renaming one to a name that already
// exists merges them (matching is case-insensitive, like MySQL's collation).
import { fn, col } from "sequelize";
import { db } from "../../database/index.js";
import { logActivity } from "../activity/service.js";
import { ValidationError } from "../http.js";

export async function listTaxonomy() {
  const count = (field) =>
    db.Products.findAll({ attributes: [[col(field), "name"], [fn("COUNT", col("id")), "count"]], group: [field], order: [[col(field), "ASC"]], raw: true });
  const [categories, brands, images] = await Promise.all([count("category"), count("brand"), db.BrandImages.findAll({ raw: true })]);
  const img = new Map(images.map((b) => [b.brandName.toLowerCase(), b]));
  return {
    categories: categories.map((c) => ({ name: c.name, count: Number(c.count) })),
    brands: brands.map((b) => ({ name: b.name, count: Number(b.count), brandImageId: img.get(b.name.toLowerCase())?.id ?? null })),
  };
}

export async function renameTaxonomy({ kind, from, to }, actor) {
  const field = kind === "category" ? "category" : kind === "brand" ? "brand" : null;
  const target = String(to || "").trim();
  const errors = {};
  if (!field) errors.kind = "Pick categories or brands";
  if (!from) errors.from = "Pick what to rename";
  if (!target) errors.to = "Enter the new name";
  else if (target.length > (field === "category" ? 50 : 100)) errors.to = "That name is too long";
  if (Object.keys(errors).length) throw new ValidationError(errors);

  const moved = await db.sequelize.transaction(async (transaction) => {
    const [n] = await db.Products.update({ [field]: target, version: db.sequelize.literal("version + 1") }, { where: { [field]: from }, transaction, hooks: false });
    if (field === "brand") {
      const source = await db.BrandImages.findOne({ where: { brandName: from }, transaction });
      const existing = await db.BrandImages.findOne({ where: { brandName: target }, transaction });
      if (source && existing && source.id !== existing.id) {
        // Keep the target's logo unless it has none and the source does.
        if ((!existing.imagePath || existing.imagePath === "NoImage") && source.imagePath && source.imagePath !== "NoImage") await existing.update({ imagePath: source.imagePath }, { transaction });
        await source.destroy({ transaction });
      } else if (source) await source.update({ brandName: target }, { transaction });
    }
    return n;
  });
  await logActivity({ actor, action: `${field}.rename`, entity: field, summary: `Renamed ${field} ${from} to ${target} (${moved} product${moved === 1 ? "" : "s"})` });
  return { moved };
}
