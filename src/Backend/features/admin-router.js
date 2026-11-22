// Everything under /api/admin. requireAdmin is applied once, here.
import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import settings from "./settings/routes.js";
import activity from "./activity/routes.js";
import stock from "./stock/routes.js";
import media from "./media/routes.js";
import productCsv from "./products/csvRoutes.js";
import products from "./products/routes.js";
import taxonomy from "./taxonomy/routes.js";
import orders from "./orders/routes.js";
import banners from "./banners/routes.js";
import brands from "./brands/routes.js";

const admin = Router();
admin.use(requireAdmin);
admin.use(settings);
admin.use(activity);
admin.use(stock);
admin.use(media);
admin.use(productCsv);
admin.use(products);
admin.use(taxonomy);
admin.use(orders);
admin.use(banners);
admin.use(brands);
// Unknown admin paths: JSON 404 rather than falling through to the SPA.
admin.use((req, res) => res.status(404).json({ message: "Not found." }));

export default admin;
