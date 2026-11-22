import { Router } from "express";
import { actorOf, asyncRoute, idParam, paging } from "../http.js";
import { sendCsv } from "../csv.js";
import { logActivity } from "../activity/service.js";
import { ADMIN_REASONS, listMovements, setStockTo } from "./service.js";
import { db } from "../../database/index.js";

const router = Router();

router.post("/variations/:id/stock", asyncRoute(async (req, res) => {
  const variationId = idParam(req.params.id);
  const { setTo, expected, reason, note } = req.body || {};
  const actor = actorOf(req);
  const result = await setStockTo({ variationId, setTo, expected, reason, note, actor });
  if (result.changed) {
    const v = await db.Variations.findByPk(variationId, { include: [{ model: db.Products, as: "product", attributes: ["name"] }] });
    await logActivity({ actor, action: "stock.adjust", entity: "variation", entityId: variationId, summary: `Set stock of ${v?.product?.name ?? "variant"} (${v?.name ?? variationId}) to ${result.stockAfter}: ${ADMIN_REASONS[reason]}` });
  }
  res.json(result);
}));

router.get("/variations/:id/stock-movements", asyncRoute(async (req, res) => {
  const p = paging(req.query, { pageSize: 50 });
  res.json(await listMovements({ variationId: idParam(req.params.id), ...p }));
}));

router.get("/stock-movements", asyncRoute(async (req, res) => {
  const { reason, from, to, sku } = req.query;
  res.json(await listMovements({ reason, from, to, sku, ...paging(req.query, { pageSize: 50 }) }));
}));

router.get("/stock-movements.csv", asyncRoute(async (req, res) => {
  const { reason, from, to, sku } = req.query;
  const { items } = await listMovements({ reason, from, to, sku, limit: 50000, offset: 0 });
  sendCsv(res, "stock-movements.csv", [
    ["date", "product", "variant", "sku", "change", "stock_after", "reason", "order_id", "note", "by"],
    ...items.map((m) => [new Date(m.createdAt).toISOString(), m.productName, m.variationName, m.sku, m.delta, m.stockAfter, m.reasonLabel, m.orderId, m.note, m.actorName]),
  ]);
}));

export default router;
