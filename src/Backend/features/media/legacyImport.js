// Moves photos from the old SKU-folder layout into product_media. Takes `db` as an argument
// (no import of database/index.js) because it runs from a migration during start-up.
import fs from "fs";
import path from "path";
import { sniffImage } from "../../file-uploads/imageType.js";

const imagesRoot = () => process.env.IMAGES_ROOT || "images";
const abs = (rel) => path.join(imagesRoot(), rel);
const relFor = (productId, variationId, mediaId, ext) => path.posix.join("product_images", String(productId), String(variationId), `${mediaId}.${ext}`);

/**
 * One-off import of the old layout images/product_images/<productId>/<sku>/<file>.
 * Variations that already have media are skipped; unmatched folders are logged and left.
 */
export async function importSkuFolders({ db, log = console }) {
  const root = path.join(imagesRoot(), "product_images");
  if (!fs.existsSync(root)) return { moved: 0, orphans: [] };
  const variations = await db.Variations.findAll({ attributes: ["id", "productId", "sku"] });
  const withMedia = new Set((await db.ProductMedia.findAll({ attributes: ["variationId"], group: ["variationId"] })).map((m) => m.variationId));
  const byKey = new Map(variations.map((v) => [`${v.productId}/${v.sku}`, v]));
  const ids = new Set(variations.map((v) => String(v.id)));
  let moved = 0;
  const orphans = [];
  for (const pid of fs.readdirSync(root)) {
    const pdir = path.join(root, pid);
    if (!fs.statSync(pdir).isDirectory()) continue;
    for (const folder of fs.readdirSync(pdir)) {
      const fdir = path.join(pdir, folder);
      if (!fs.statSync(fdir).isDirectory()) continue;
      const v = byKey.get(`${pid}/${folder}`);
      if (!v) {
        // New-layout folders are named by variation id; anything else is an orphan.
        if (!(ids.has(folder) && /^\d+$/.test(folder))) orphans.push(`${pid}/${folder}`);
        continue;
      }
      if (withMedia.has(v.id)) continue;
      const files = fs.readdirSync(fdir).filter((f) => fs.statSync(path.join(fdir, f)).isFile()).sort();
      let position = 0;
      for (const f of files) {
        const ext = sniffImage(fs.readFileSync(path.join(fdir, f)));
        if (!ext) {
          orphans.push(`${pid}/${folder}/${f}`);
          continue;
        }
        const m = await db.ProductMedia.create({ variationId: v.id, path: "pending", position: position++ });
        const rel = relFor(v.productId, v.id, m.id, ext);
        fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
        fs.renameSync(path.join(fdir, f), abs(rel));
        await m.update({ path: rel });
        moved++;
      }
      if (!fs.readdirSync(fdir).length) fs.rmdirSync(fdir);
    }
  }
  if (orphans.length) log.warn?.(`Product images not matched to a variant (left in place): ${orphans.join(", ")}`);
  return { moved, orphans };
}
