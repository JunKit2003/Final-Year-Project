// Everything under /api/admin. The admin check (re-read from the database) is applied once, here.
import { Router } from "express";
import { requireActiveAdmin } from "./requireActiveAdmin.js";
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
import customers from "./customers/routes.js";
import dashboard from "./dashboard/routes.js";

const admin = Router();
admin.use(requireActiveAdmin);
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
admin.use(customers);
admin.use(dashboard);
// Unknown admin paths: JSON 404 rather than falling through to the SPA.
admin.use((req, res) => res.status(404).json({ message: "Not found." }));

export default admin;
