import fs from "fs";
import path from "path";
import { db } from "../../database/index.js";
import { sniffImage, MAX_IMAGE_BYTES, IMAGE_TOO_BIG, IMAGE_BAD_TYPE } from "../../file-uploads/imageType.js";
import { NotFoundError, ValidationError } from "../http.js";

/** Where uploaded images live on disk (served at /images). */
export const imagesRoot = () => process.env.IMAGES_ROOT || "images";
const assetBase = () => process.env.ASSET_BASE_URL ?? `${process.env.HOST}:${process.env.PORT_SERVER}`;
export const mediaUrl = (rel) => `${assetBase()}/images/${rel}`;
const abs = (rel) => path.join(imagesRoot(), rel);

/** Check an uploaded buffer; returns its extension. */
export function checkImage(file) {
  if (!file?.buffer) throw new ValidationError({ file: "Choose a photo" }, "Choose a photo");
  if (file.size > MAX_IMAGE_BYTES || file.buffer.length > MAX_IMAGE_BYTES) throw new ValidationError({ file: IMAGE_TOO_BIG }, IMAGE_TOO_BIG);
  const ext = sniffImage(file.buffer);
  if (!ext) throw new ValidationError({ file: IMAGE_BAD_TYPE }, IMAGE_BAD_TYPE);
  return ext;
}

async function variationWithProduct(id, transaction) {
  const v = await db.Variations.findByPk(id, { transaction });
  if (!v) throw new NotFoundError("Variant not found.");
  return v;
}

const relFor = (productId, variationId, mediaId, ext) => path.posix.join("product_images", String(productId), String(variationId), `${mediaId}.${ext}`);

export const toMediaJSON = (m) => ({ id: m.id, variationId: m.variationId, url: mediaUrl(m.path), position: m.position, alt: m.alt });

export async function addMedia(variationId, file) {
  const ext = checkImage(file);
  const v = await variationWithProduct(variationId);
  const position = ((await db.ProductMedia.max("position", { where: { variationId } })) ?? -1) + 1;
  const m = await db.ProductMedia.create({ variationId, path: "pending", position });
  const rel = relFor(v.productId, variationId, m.id, ext);
  try {
    fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
    fs.writeFileSync(abs(rel), file.buffer);
    await m.update({ path: rel });
  } catch (error) {
    await m.destroy().catch(() => {});
    fs.rmSync(abs(rel), { force: true });
    throw error;
  }
  return toMediaJSON(m);
}

/** items: [{ id, variationId, position }]. Moving a photo to another variant moves its file. */
export async function reorderMedia(items) {
  if (!Array.isArray(items)) throw new ValidationError({ items: "Send a list" });
  return db.sequelize.transaction(async (transaction) => {
    for (const it of items) {
      const m = await db.ProductMedia.findByPk(it.id, { transaction });
      if (!m) throw new NotFoundError("Photo not found.");
      const target = Number(it.variationId ?? m.variationId);
      const update = { position: Number(it.position) || 0 };
      if (target !== m.variationId) {
        const [from, to] = [await variationWithProduct(m.variationId, transaction), await variationWithProduct(target, transaction)];
        if (from.productId !== to.productId) throw new ValidationError({ variationId: "Photos can only move within a product" });
        const rel = relFor(to.productId, target, m.id, path.extname(m.path).slice(1));
        fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
        if (fs.existsSync(abs(m.path))) fs.renameSync(abs(m.path), abs(rel));
        Object.assign(update, { variationId: target, path: rel });
      }
      await m.update(update, { transaction });
    }
    return true;
  });
}

export async function removeMedia(id) {
  const m = await db.ProductMedia.findByPk(id);
  if (!m) throw new NotFoundError("Photo not found.");
  await m.destroy();
  fs.rmSync(abs(m.path), { force: true });
}

/** Delete the files of media rows that are about to go (variant or product deleted). */
export async function deleteMediaFiles(variationIds) {
  if (!variationIds.length) return;
  const rows = await db.ProductMedia.findAll({ where: { variationId: variationIds } });
  for (const m of rows) fs.rmSync(abs(m.path), { force: true });
}

export async function copyMedia(fromVariationId, toVariationId) {
  const [from, to] = [await variationWithProduct(fromVariationId), await variationWithProduct(toVariationId)];
  const rows = await db.ProductMedia.findAll({ where: { variationId: from.id }, order: [["position", "ASC"], ["id", "ASC"]] });
  let position = ((await db.ProductMedia.max("position", { where: { variationId: to.id } })) ?? -1) + 1;
  const out = [];
  for (const r of rows) {
    if (!fs.existsSync(abs(r.path))) continue;
    const m = await db.ProductMedia.create({ variationId: to.id, path: "pending", position: position++, alt: r.alt });
    const rel = relFor(to.productId, to.id, m.id, path.extname(r.path).slice(1));
    fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
    fs.copyFileSync(abs(r.path), abs(rel));
    await m.update({ path: rel });
    out.push(toMediaJSON(m));
  }
  return out;
}

/** Map of variationId -> [{ id, url, position, alt }] in display order. */
export async function mediaForVariations(variationIds, { transaction } = {}) {
  const map = new Map(variationIds.map((id) => [id, []]));
  if (!variationIds.length) return map;
  const rows = await db.ProductMedia.findAll({ where: { variationId: variationIds }, order: [["position", "ASC"], ["id", "ASC"]], transaction });
  for (const r of rows) map.get(r.variationId)?.push(toMediaJSON(r));
  return map;
}

export { importSkuFolders } from "./legacyImport.js";
