import { Router } from "express";
import { actorOf, asyncRoute } from "../http.js";
import { listTaxonomy, renameTaxonomy } from "./service.js";

const router = Router();
router.get("/taxonomy", asyncRoute(async (req, res) => res.json(await listTaxonomy())));
router.post("/taxonomy/rename", asyncRoute(async (req, res) => res.json(await renameTaxonomy(req.body || {}, actorOf(req)))));
export default router;
