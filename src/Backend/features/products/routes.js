import { Router } from "express";
import { actorOf, asyncRoute, idParam, paging } from "../http.js";
import { bulkProducts, createProduct, deleteProduct, duplicateProduct, getProduct, listProducts, patchVariation, updateProduct } from "./service.js";

const router = Router();

router.get("/products", asyncRoute(async (req, res) => {
  const { q, status, category, brand, stock, sort } = req.query;
  const { page, pageSize } = paging(req.query, { pageSize: 25 });
  res.json({ ...(await listProducts({ q, status, category, brand, stock, sort, page, pageSize })), page, pageSize });
}));
router.post("/products", asyncRoute(async (req, res) => res.status(201).json(await createProduct(req.body, actorOf(req)))));
router.post("/products/bulk", asyncRoute(async (req, res) => res.json(await bulkProducts(req.body || {}, actorOf(req)))));
router.get("/products/:id", asyncRoute(async (req, res) => res.json(await getProduct(idParam(req.params.id)))));
router.put("/products/:id", asyncRoute(async (req, res) => res.json(await updateProduct(idParam(req.params.id), req.body, actorOf(req)))));
router.delete("/products/:id", asyncRoute(async (req, res) => {
  await deleteProduct(idParam(req.params.id), actorOf(req));
  res.status(204).end();
}));
router.post("/products/:id/duplicate", asyncRoute(async (req, res) => res.status(201).json(await duplicateProduct(idParam(req.params.id), actorOf(req)))));
router.patch("/variations/:id", asyncRoute(async (req, res) => res.json(await patchVariation(idParam(req.params.id), req.body || {}, actorOf(req)))));

export default router;
