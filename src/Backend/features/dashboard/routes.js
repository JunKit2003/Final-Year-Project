import { Router } from "express";
import { asyncRoute } from "../http.js";
import { dashboard } from "./service.js";

const router = Router();
router.get("/dashboard", asyncRoute(async (req, res) => res.json(await dashboard())));
export default router;
