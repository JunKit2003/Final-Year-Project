import { Router } from "express";
import { asyncRoute, paging } from "../http.js";
import { listActivity } from "./service.js";

const router = Router();
router.get("/activity", asyncRoute(async (req, res) => {
  const p = paging(req.query, { pageSize: 50 });
  if (p.offset >= 500) return res.json({ items: [], total: 500 });
  res.json(await listActivity(p));
}));
export default router;
