// Every admin route refuses signed-out users (401) and customers (403).
import { describe, expect, it } from "vitest";
import request from "supertest";
import routes from "../routes/routes.js";
import { CUSTOMER, appAs } from "../test/helpers.js";

const ROUTES = [
  ["get", "/api/admin/dashboard"], ["get", "/api/admin/activity"],
  ["get", "/api/admin/settings/shop"], ["put", "/api/admin/settings/shop"], ["post", "/api/admin/settings/upload"],
  ["get", "/api/admin/products"], ["get", "/api/admin/products/export.csv"], ["post", "/api/admin/products/import"],
  ["post", "/api/admin/variations/1/media"], ["post", "/api/admin/variations/1/media/copy-from/2"], ["patch", "/api/admin/media/order"], ["delete", "/api/admin/media/1"],
  ["post", "/api/admin/variations/1/stock"], ["get", "/api/admin/variations/1/stock-movements"], ["get", "/api/admin/stock-movements"], ["get", "/api/admin/stock-movements.csv"],
  ["get", "/api/admin/taxonomy"], ["post", "/api/admin/taxonomy/rename"],
  ["get", "/api/admin/banners"], ["post", "/api/admin/banners"], ["patch", "/api/admin/banners/order"], ["put", "/api/admin/banners/1"], ["delete", "/api/admin/banners/1"],
  ["get", "/api/admin/brands"], ["patch", "/api/admin/brands/order"], ["put", "/api/admin/brands/1"],
  ["get", "/api/admin/customers"], ["get", "/api/admin/customers/1"], ["patch", "/api/admin/customers/1"],
  ["post", "/api/admin/orders/1/complete"], ["post", "/api/admin/orders/1/reopen"],
];

describe("admin access", () => {
  it.each(ROUTES)("%s %s", async (m, p) => {
    expect((await request(appAs(routes, null, "/api"))[m](p)).status).toBe(401);
    expect((await request(appAs(routes, CUSTOMER, "/api"))[m](p)).status).toBe(403);
  });
});
