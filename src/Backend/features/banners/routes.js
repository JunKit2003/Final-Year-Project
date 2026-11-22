import { Router } from "express";
import { actorOf, asyncRoute, idParam } from "../http.js";
import { singleImage } from "../media/routes.js";
import { db } from "../../database/index.js";
import { addBanner, deleteBanner, listBanners, orderRows, updateBanner } from "./service.js";

const router = Router();
router.get("/banners", asyncRoute(async (req, res) => res.json({ items: await listBanners() })));
router.post("/banners", singleImage(), asyncRoute(async (req, res) => res.status(201).json(await addBanner(req.file, req.body || {}, actorOf(req)))));
router.patch("/banners/order", asyncRoute(async (req, res) => {
  await orderRows(db.BannerImage, req.body?.ids);
  res.json({ items: await listBanners() });
}));
router.put("/banners/:id", asyncRoute(async (req, res) => res.json(await updateBanner(idParam(req.params.id), req.body || {}, actorOf(req)))));
router.delete("/banners/:id", asyncRoute(async (req, res) => {
  await deleteBanner(idParam(req.params.id), actorOf(req));
  res.status(204).end();
}));
export default router;
