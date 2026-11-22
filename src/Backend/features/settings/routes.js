import { Router } from "express";
import { asyncRoute, actorOf } from "../http.js";
import { getGroup, getSiteWithEtag, saveGroup } from "./service.js";

/** Public: GET /api/site */
export const publicSite = asyncRoute(async (req, res) => {
  const { site, etag } = await getSiteWithEtag();
  res.set("Cache-Control", "no-cache");
  res.set("ETag", etag);
  if (req.get("If-None-Match") === etag) return res.status(304).end();
  res.json(site);
});

const router = Router();
router.get("/settings/:key", asyncRoute(async (req, res) => res.json(await getGroup(req.params.key))));
router.put("/settings/:key", asyncRoute(async (req, res) => {
  res.json(await saveGroup(req.params.key, req.body?.value, req.body?.version, actorOf(req)));
}));
export default router;
