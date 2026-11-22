import { Router } from "express";
import { actorOf, asyncRoute, idParam, paging } from "../http.js";
import { addNote, cancelOrder, getOrderDetail, listOrders, moveOrder, requestRefund } from "./service.js";

const router = Router();
router.get("/orders", asyncRoute(async (req, res) => {
  const { status, payment, from, to, q } = req.query;
  const p = paging(req.query, { pageSize: 25 });
  res.json({ ...(await listOrders({ status, payment, from, to, q, ...p })), page: p.page, pageSize: p.pageSize });
}));
router.get("/orders/:id", asyncRoute(async (req, res) => res.json(await getOrderDetail(idParam(req.params.id)))));
for (const action of ["ship", "complete", "reopen"]) {
  router.post(`/orders/:id/${action}`, asyncRoute(async (req, res) => {
    const id = idParam(req.params.id);
    await moveOrder(id, action, req.body || {}, actorOf(req));
    res.json(await getOrderDetail(id));
  }));
}
router.post("/orders/:id/cancel", asyncRoute(async (req, res) => {
  const id = idParam(req.params.id);
  const { refund } = await cancelOrder(id, req.body || {}, actorOf(req));
  res.json({ ...(await getOrderDetail(id)), refund });
}));
router.post("/orders/:id/refunds", asyncRoute(async (req, res) => {
  const id = idParam(req.params.id);
  const { amount, reason, version } = req.body || {};
  const refund = await requestRefund(id, { amount, reason, version, actor: actorOf(req) });
  res.status(201).json({ ...(await getOrderDetail(id)), refund });
}));
router.post("/orders/:id/notes", asyncRoute(async (req, res) => res.status(201).json(await addNote(idParam(req.params.id), req.body?.note, actorOf(req)))));
export default router;
