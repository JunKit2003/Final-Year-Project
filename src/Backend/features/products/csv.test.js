import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import routes from "../../routes/routes.js";
import { db } from "../../database/index.js";
import { parseCsv, toCsv } from "../csv.js";
import { ADMIN, appAs, makeProduct, resetTables } from "../../test/helpers.js";

const admin = appAs(routes, ADMIN, "/api");
const upload = (csv, dry) => request(admin).post(`/api/admin/products/import${dry ? "?dryRun=1" : ""}`).attach("file", Buffer.from(csv), "p.csv");

describe("csv parsing", () => {
  it("handles BOM, CRLF, quotes and trailing blank lines", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","he said ""hi"""\r\n\r\n')).toEqual([["a", "b"], ["x, y", 'he said "hi"']]);
  });
  it("keeps newlines inside quotes and skips blank rows", () => {
    expect(parseCsv('a\n"line 1\nline 2"\n\nb\n')).toEqual([["a"], ["line 1\nline 2"], ["b"]]);
  });
  it("round-trips through toCsv and defuses formulas", () => {
    const rows = [["a", "b,c", 'q"x'], ["=SUM(A1)", "1", ""]];
    const back = parseCsv(toCsv(rows));
    expect(back[0]).toEqual(rows[0]);
    expect(back[1][0]).toBe("'=SUM(A1)");
  });
});

describe("product import/export", () => {
  let p25;
  beforeEach(async () => {
    await resetTables("StockMovement", "AdminActivity", "ProductMedia", "OrderItem", "Cart", "Variations", "Products", "BrandImages");
    ({ product: p25 } = await makeProduct({ variations: [{ name: "Red", sku: "DMR-RED", price: 389, stock: 4 }] }));
  });

  const header = "product_id,product_name,brand,category,status,featured,description,variant_name,sku,price,compare_at_price,stock,intended_use";

  it("dry-runs, then applies only the good lines", async () => {
    const csv = [
      header,
      `${p25.id},DMR Vault,DMR,Pedals,live,no,,Red,DMR-RED,399.00,,4,`,
      `${p25.id},DMR Vault,DMR,Pedals,live,no,,Blue,DMR-BLUE,389.00,,3,`,
      `${p25.id},DMR Vault,DMR,Pedals,live,no,,Pink,DMR-PINK,abc,,1,`,
    ].join("\r\n");
    const dry = await upload(csv, true);
    expect(dry.status).toBe(200);
    expect(dry.body.summary).toMatchObject({ update: 1, createVariant: 1, error: 1, applicable: 2 });
    expect(dry.body.lines.find((l) => l.action === "error").message).toBe("Line 4: price must be a number");
    expect(Number((await db.Variations.findOne({ where: { sku: "DMR-RED" } })).price)).toBe(389);
    const apply = await upload(csv, false);
    expect(apply.status).toBe(200);
    expect(Number((await db.Variations.findOne({ where: { sku: "DMR-RED" } })).price)).toBe(399);
    const blue = await db.Variations.findOne({ where: { sku: "DMR-BLUE" } });
    expect(blue.productId).toBe(p25.id);
    expect(blue.stock).toBe(3);
    expect(await db.StockMovement.count({ where: { reason: "import" } })).toBe(1);
  });

  it("groups new rows into one draft product", async () => {
    const csv = [header, ",Grip X,Deity,Grips,,,Soft,Black,GX-BLK,99,,5,", ",Grip X,Deity,Grips,,,Soft,Red,GX-RED,99,,2,"].join("\n");
    await upload(csv, false);
    const p = await db.Products.findOne({ where: { name: "Grip X" }, include: [{ model: db.Variations, as: "variations" }] });
    expect(p.status).toBe("draft");
    expect(p.variations.map((v) => v.sku).sort()).toEqual(["GX-BLK", "GX-RED"]);
  });

  it("exports and re-imports with no changes", async () => {
    await makeProduct({ name: 'Says "hi", twice', description: "Line 1\nLine 2", variations: [{ name: "One", sku: "Q-1", price: 10.5, stock: 0 }] });
    const exp = await request(admin).get("/api/admin/products/export.csv");
    expect(exp.status).toBe(200);
    expect(exp.headers["content-disposition"]).toMatch(/products\.csv/);
    const dry = await upload(exp.text, true);
    expect(dry.body.summary).toMatchObject({ update: 0, createVariant: 0, createProduct: 0, error: 0 });
  });

  it("explains a missing column", async () => {
    const res = await upload("name,price\nA,1", true);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Missing column "sku"/);
  });
});
