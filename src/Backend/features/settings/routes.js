import { Router } from "express";
import { asyncRoute, actorOf } from "../http.js";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getGroup, getSiteWithEtag, saveGroup } from "./service.js";
import { singleImage } from "../media/routes.js";
import { checkImage, imagesRoot } from "../media/service.js";

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
// Images used in site content (about photo, sign-in photo). Returns a /images/... path.
router.post("/settings/upload", singleImage(), asyncRoute(async (req, res) => {
  const ext = checkImage(req.file);
  const rel = path.posix.join("site", `${randomUUID()}.${ext}`);
  fs.mkdirSync(path.join(imagesRoot(), "site"), { recursive: true });
  fs.writeFileSync(path.join(imagesRoot(), rel), req.file.buffer);
  res.status(201).json({ url: `/images/${rel}` });
}));
export default router;
