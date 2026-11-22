import { Router } from "express";
import { actorOf, asyncRoute, idParam, paging } from "../http.js";
import { getCustomer, listCustomers, updateCustomer } from "./service.js";

const router = Router();
router.get("/customers", asyncRoute(async (req, res) => {
  const { q, role, active } = req.query;
  const p = paging(req.query, { pageSize: 25 });
  res.json({ ...(await listCustomers({ q, role, active, ...p })), page: p.page, pageSize: p.pageSize });
}));
router.get("/customers/:id", asyncRoute(async (req, res) => res.json(await getCustomer(idParam(req.params.id)))));
router.patch("/customers/:id", asyncRoute(async (req, res) => res.json(await updateCustomer(idParam(req.params.id), req.body || {}, actorOf(req)))));
export default router;
