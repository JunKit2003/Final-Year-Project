// Home hero banners: files in images/banner_images/, ordered, with alt text and an optional link.
import fs from "fs";
import path from "path";
import { db } from "../../database/index.js";
import { checkImage, imagesRoot } from "../media/service.js";
import { logActivity } from "../activity/service.js";
import { NotFoundError, ValidationError } from "../http.js";

const dir = () => path.join(imagesRoot(), "banner_images");
const toJSON = (b) => ({ id: b.id, imageUrl: `/images/banner_images/${b.directory}`, directory: b.directory, alt: b.alt || "", linkUrl: b.linkUrl || "", isActive: b.isActive, position: b.position });

function clean({ alt, linkUrl }) {
  const errors = {};
  const a = String(alt ?? "").trim();
  const l = String(linkUrl ?? "").trim();
  if (a.length > 200) errors.alt = "Keep it under 200 characters";
  if (l && !/^(\/(?!\/)[^\s]*|https:\/\/[^\s]+)$/.test(l)) errors.linkUrl = "Link must start with / or https://";
  if (Object.keys(errors).length) throw new ValidationError(errors);
  return { alt: a || null, linkUrl: l || null };
}

export async function publicBanners() {
  return (await db.BannerImage.findAll({ where: { isActive: true }, order: [["position", "ASC"], ["id", "ASC"]] })).map(toJSON);
}

export async function listBanners() {
  return (await db.BannerImage.findAll({ order: [["position", "ASC"], ["id", "ASC"]] })).map(toJSON);
}

export async function addBanner(file, fields, actor) {
  const ext = checkImage(file);
  const meta = clean(fields);
  const name = `banner_${Date.now()}_${Math.floor(Math.random() * 1e4)}.${ext}`;
  fs.mkdirSync(dir(), { recursive: true });
  fs.writeFileSync(path.join(dir(), name), file.buffer);
  const position = ((await db.BannerImage.max("position")) ?? 0) + 1;
  const b = await db.BannerImage.create({ directory: name, position, isActive: true, ...meta });
  await logActivity({ actor, action: "banner.create", entity: "banner", entityId: b.id, summary: "Added a banner" });
  return toJSON(b);
}

export async function updateBanner(id, body, actor) {
  const b = await db.BannerImage.findByPk(id);
  if (!b) throw new NotFoundError("Banner not found.");
  await b.update({ ...clean(body), ...(body.isActive !== undefined ? { isActive: body.isActive === true || body.isActive === "true" } : {}) });
  await logActivity({ actor, action: "banner.update", entity: "banner", entityId: id, summary: `Updated banner ${id}` });
  return toJSON(b);
}

export async function deleteBanner(id, actor) {
  const b = await db.BannerImage.findByPk(id);
  if (!b) throw new NotFoundError("Banner not found.");
  await b.destroy();
  fs.rmSync(path.join(dir(), path.basename(b.directory)), { force: true });
  await logActivity({ actor, action: "banner.delete", entity: "banner", entityId: id, summary: `Deleted banner ${id}` });
}

/** Rewrite positions from an ordered list of ids. */
export async function orderRows(model, ids) {
  if (!Array.isArray(ids)) throw new ValidationError({ ids: "Send the ids in order" });
  await db.sequelize.transaction(async (transaction) => {
    for (const [i, id] of ids.entries()) await model.update({ position: i + 1 }, { where: { id }, transaction });
  });
}
