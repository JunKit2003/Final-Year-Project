import { Router } from "express";
import multer from "multer";
import { actorOf, asyncRoute, ValidationError } from "../http.js";
import { sendCsv } from "../csv.js";
import { applyImport, exportRows, planImport } from "./csv.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });
const single = (req, res, next) =>
  upload.single("file")(req, res, (err) => (err ? res.status(400).json({ message: err.code === "LIMIT_FILE_SIZE" ? "CSV files must be 2 MB or smaller" : "Upload one CSV file." }) : next()));

// Registered before /products/:id so "export.csv" isn't taken for an id.
const router = Router();
router.get("/products/export.csv", asyncRoute(async (req, res) => sendCsv(res, "products.csv", await exportRows())));
router.post("/products/import", single, asyncRoute(async (req, res) => {
  if (!req.file) throw new ValidationError({ file: "Choose a CSV file" }, "Choose a CSV file.");
  const text = req.file.buffer.toString("utf8");
  const dry = req.query.dryRun === "1" || req.query.dryRun === "true";
  res.json(dry ? await planImport(text) : await applyImport(text, actorOf(req)));
}));
export default router;
