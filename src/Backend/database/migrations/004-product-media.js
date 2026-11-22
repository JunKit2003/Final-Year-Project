// Photos move from images/product_images/<productId>/<sku>/ to
// images/product_images/<productId>/<variationId>/<mediaId>.<ext> with a product_media row each.
import { importSkuFolders } from "../../features/media/legacyImport.js";

export async function up({ db }) {
  const r = await importSkuFolders({ db });
  if (r.moved) console.log(`Moved ${r.moved} product photos into product_media.`);
}
