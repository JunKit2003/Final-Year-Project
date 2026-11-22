import { Router } from "express";
import { actorOf, asyncRoute, idParam } from "../http.js";
import { singleImage } from "../media/routes.js";
import { db } from "../../database/index.js";
import { orderRows } from "../banners/service.js";
import { listBrands, updateBrand } from "./service.js";

const router = Router();
router.get("/brands", asyncRoute(async (req, res) => res.json({ items: await listBrands() })));
router.patch("/brands/order", asyncRoute(async (req, res) => {
  await orderRows(db.BrandImages, req.body?.ids);
  res.json({ items: await listBrands() });
}));
router.put("/brands/:id", singleImage(), asyncRoute(async (req, res) => res.json(await updateBrand(idParam(req.params.id), req.file, req.body || {}, actorOf(req)))));
export default router;
