// Brand logos, visibility and order. A brand row exists for every brand used on a product.
import fs from "fs";
import path from "path";
import { fn, col } from "sequelize";
import { db } from "../../database/index.js";
import { checkImage, imagesRoot } from "../media/service.js";
import { logActivity } from "../activity/service.js";
import { NotFoundError } from "../http.js";

const hasImage = (p) => p && p !== "NoImage";
const toJSON = (b, count) => ({ id: b.id, brandName: b.brandName, imageUrl: hasImage(b.imagePath) ? `/images/brand_images/${b.imagePath}` : null, isVisible: b.isVisible, position: b.position, productCount: count ?? undefined });

/** Shop: visible brands that have live products, in order. */
export async function publicBrands() {
  const live = await db.Products.findAll({ where: { status: "live" }, attributes: [[fn("DISTINCT", col("brand")), "brand"]], raw: true });
  const names = new Set(live.map((r) => r.brand.toLowerCase()));
  const rows = await db.BrandImages.findAll({ where: { isVisible: true }, order: [["position", "ASC"], ["id", "ASC"]] });
  return rows.filter((b) => names.has(b.brandName.toLowerCase())).map((b) => toJSON(b));
}

export async function listBrands() {
  const counts = await db.Products.findAll({ attributes: ["brand", [fn("COUNT", col("id")), "n"]], group: ["brand"], raw: true });
  const by = new Map(counts.map((c) => [c.brand.toLowerCase(), Number(c.n)]));
  const rows = await db.BrandImages.findAll({ order: [["position", "ASC"], ["id", "ASC"]] });
  return rows.map((b) => toJSON(b, by.get(b.brandName.toLowerCase()) || 0));
}

export async function updateBrand(id, file, body, actor) {
  const b = await db.BrandImages.findByPk(id);
  if (!b) throw new NotFoundError("Brand not found.");
  const patch = {};
  if (body.isVisible !== undefined) patch.isVisible = body.isVisible === true || body.isVisible === "true";
  if (file) {
    const ext = checkImage(file);
    const name = `${b.id}_${Date.now()}.${ext}`;
    const dir = path.join(imagesRoot(), "brand_images");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), file.buffer);
    if (hasImage(b.imagePath)) fs.rmSync(path.join(dir, path.basename(b.imagePath)), { force: true });
    patch.imagePath = name;
  }
  if (body.removeImage === true || body.removeImage === "true") patch.imagePath = "NoImage";
  await b.update(patch);
  await logActivity({ actor, action: "brand.update", entity: "brand", entityId: id, summary: `Updated brand ${b.brandName}` });
  return toJSON(b);
}
