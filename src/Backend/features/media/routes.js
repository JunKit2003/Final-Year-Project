import { Router } from "express";
import multer from "multer";
import { asyncRoute, idParam } from "../http.js";
import { MAX_IMAGE_BYTES, IMAGE_TOO_BIG } from "../../file-uploads/imageType.js";
import { addMedia, copyMedia, removeMedia, reorderMedia } from "./service.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } });

/** multer single-file upload with friendly errors. */
export const singleImage = (field = "file") => (req, res, next) =>
  upload.single(field)(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ message: IMAGE_TOO_BIG, errors: { file: IMAGE_TOO_BIG } });
    return res.status(400).json({ message: "Upload one photo at a time.", errors: { file: err.message } });
  });

const router = Router();
router.post("/variations/:id/media", singleImage(), asyncRoute(async (req, res) => res.status(201).json(await addMedia(idParam(req.params.id), req.file))));
router.post("/variations/:id/media/copy-from/:fromId", asyncRoute(async (req, res) => res.json(await copyMedia(idParam(req.params.fromId), idParam(req.params.id)))));
router.patch("/media/order", asyncRoute(async (req, res) => {
  await reorderMedia(req.body?.items);
  res.json({ ok: true });
}));
router.delete("/media/:id", asyncRoute(async (req, res) => {
  await removeMedia(idParam(req.params.id));
  res.status(204).end();
}));
export default router;
