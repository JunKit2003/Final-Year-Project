import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import routes from "../../routes/routes.js";
import { db } from "../../database/index.js";
import { DEFAULTS, mergeSite } from "../../../shared/site-schema.js";
import { invalidateSite } from "./service.js";
import { ADMIN, CUSTOMER, appAs, resetTables } from "../../test/helpers.js";

const admin = appAs(routes, ADMIN, "/api");

describe("site settings", () => {
  beforeEach(async () => {
    await resetTables("SiteSetting", "AdminActivity");
    invalidateSite();
  });

  it("serves defaults when nothing is saved", async () => {
    const res = await request(admin).get("/api/site");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mergeSite({}));
    expect(res.headers["cache-control"]).toBe("no-cache");
  });

  it("answers 304 when the ETag matches", async () => {
    const first = await request(admin).get("/api/site");
    const again = await request(admin).get("/api/site").set("If-None-Match", first.headers.etag);
    expect(again.status).toBe(304);
  });

  it("saves a group and serves it", async () => {
    const res = await request(admin).put("/api/admin/settings/shop").send({ value: { ...DEFAULTS.shop, phone: "+6012-345 6789" }, version: 1 });
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(2);
    expect((await request(admin).get("/api/site")).body.shop.phone).toBe("+6012-345 6789");
    const g = await request(admin).get("/api/admin/settings/shop");
    expect(g.body).toMatchObject({ version: 2, label: "Shop details" });
  });

  it("refuses a stale save", async () => {
    await request(admin).put("/api/admin/settings/shop").send({ value: DEFAULTS.shop, version: 1 });
    const res = await request(admin).put("/api/admin/settings/shop").send({ value: { ...DEFAULTS.shop, phone: "+60 1" }, version: 1 });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ code: "version_conflict", message: "Someone else saved these settings since you opened them. Reload to see their changes." });
  });

  it("refuses an empty headline and keeps the old one live", async () => {
    const hero = { ...DEFAULTS["content.home.hero"], lines: [{ value: "" }] };
    const res = await request(admin).put("/api/admin/settings/content.home.hero").send({ value: hero, version: 1 });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual({ "lines.0.value": "Required" });
    expect((await request(admin).get("/api/site")).body["content.home.hero"].lines).toEqual(DEFAULTS["content.home.hero"].lines);
  });

  it("404s an unknown group", async () => {
    expect((await request(admin).get("/api/admin/settings/nope")).status).toBe(404);
  });

  it("logs the change", async () => {
    await request(admin).put("/api/admin/settings/shop").send({ value: DEFAULTS.shop, version: 1 });
    const row = await db.AdminActivity.findOne();
    expect(row).toMatchObject({ action: "settings.update", summary: "Updated Shop details", actorId: ADMIN.id });
    const list = await request(admin).get("/api/admin/activity");
    expect(list.body.items[0].summary).toBe("Updated Shop details");
  });

  it("uploads a content image and refuses non-images", async () => {
    const os = await import("os");
    const fs = await import("fs");
    process.env.IMAGES_ROOT = fs.mkdtempSync(`${os.tmpdir()}/site-`);
    const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(40, 1)]);
    const ok = await request(admin).post("/api/admin/settings/upload").attach("file", jpg, "shop.jpg");
    expect(ok.status).toBe(201);
    expect(ok.body.url).toMatch(/^\/images\/site\/[\w-]+\.jpg$/);
    const bad = await request(admin).post("/api/admin/settings/upload").attach("file", Buffer.from("not an image at all, sorry"), "x.jpg");
    expect(bad.status).toBe(400);
    delete process.env.IMAGES_ROOT;
  });

  it.each([
    ["post", "/api/admin/settings/upload"],
    ["get", "/api/admin/settings/shop"],
    ["put", "/api/admin/settings/shop"],
    ["get", "/api/admin/activity"],
  ])("%s %s is admin-only", async (method, path) => {
    expect((await request(appAs(routes, null, "/api"))[method](path)).status).toBe(401);
    expect((await request(appAs(routes, CUSTOMER, "/api"))[method](path)).status).toBe(403);
  });
});
