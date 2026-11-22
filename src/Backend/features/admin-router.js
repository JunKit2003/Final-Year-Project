// Everything under /api/admin. requireAdmin is applied once, here.
import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import settings from "./settings/routes.js";
import activity from "./activity/routes.js";
import stock from "./stock/routes.js";
import media from "./media/routes.js";

const admin = Router();
admin.use(requireAdmin);
admin.use(settings);
admin.use(activity);
admin.use(stock);
admin.use(media);
// Unknown admin paths: JSON 404 rather than falling through to the SPA.
admin.use((req, res) => res.status(404).json({ message: "Not found." }));

export default admin;
