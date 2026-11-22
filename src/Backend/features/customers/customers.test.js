import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import routes from "../../routes/routes.js";
import { db } from "../../database/index.js";
import { ADMIN, appAs, makeAccount, resetTables } from "../../test/helpers.js";

const admin = appAs(routes, ADMIN, "/api");

describe("customers", () => {
  beforeEach(async () => {
    await resetTables("AdminActivity", "OrderItem", "Order");
    // Only the seeded admin (id 1) stays an admin between tests.
    await db.Account.update({ category: "Customer" }, { where: { id: { [db.Sequelize.Op.ne]: 1 } }, hooks: false });
    await db.Account.update({ category: "Admin", isActive: true }, { where: { id: 1 }, hooks: false });
  });

  it("lists and finds customers", async () => {
    const a = await makeAccount({ first_name: "Aiman", username: `aiman${Date.now()}` });
    const res = await request(admin).get("/api/admin/customers").query({ q: a.username });
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ id: a.id, name: "Aiman User", category: "Customer", isActive: true, orderCount: 0, spent: 0 });
    expect(res.body.items[0]).not.toHaveProperty("password");
    const one = await request(admin).get(`/api/admin/customers/${a.id}`);
    expect(one.body.orders).toEqual([]);
  });

  it("won't let you remove your own admin access", async () => {
    const res = await request(admin).patch("/api/admin/customers/1").send({ category: "Customer" });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe("You can't remove your own admin access");
    expect((await request(admin).patch("/api/admin/customers/1").send({ isActive: false })).body.message).toBe("You can't deactivate your own account");
  });

  it("keeps at least one active admin", async () => {
    const other = await makeAccount({ category: "Admin" });
    const asOther = appAs(routes, { id: other.id, category: "Admin", username: other.username }, "/api");
    const ok = await request(asOther).patch("/api/admin/customers/1").send({ category: "Customer" });
    expect(ok.status).toBe(200);
    const res = await request(admin).patch(`/api/admin/customers/${other.id}`).send({ category: "Customer" });
    expect(res.status).toBe(403); // id 1 is no longer an admin
    await db.Account.update({ category: "Admin" }, { where: { id: 1 }, hooks: false });
    await db.Account.update({ category: "Customer" }, { where: { id: other.id }, hooks: false });
  });

  it("a deactivated customer gets the wrong-password answer", async () => {
    const pw = "Riding#2026";
    const a = await makeAccount({ password: await bcrypt.hash(pw, 4) });
    await request(admin).patch(`/api/admin/customers/${a.id}`).send({ isActive: false });
    // login regenerates the session; give the fake session what express-session would.
    const withSession = (req, _res, next) => {
      req.session = Object.assign(req.session || {}, { regenerate: (cb) => cb(), save: (cb) => cb() });
      next();
    };
    const res = await request(appAs((req, res, next) => withSession(req, res, () => routes(req, res, next)), null, "/api")).post("/api/account/login").send({ emailOrUsername: a.username, password: pw });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid email/username or password.");
    await request(admin).patch(`/api/admin/customers/${a.id}`).send({ isActive: true });
    const ok = await request(appAs((req, res, next) => withSession(req, res, () => routes(req, res, next)), null, "/api")).post("/api/account/login").send({ emailOrUsername: a.username, password: pw });
    expect(ok.status).toBe(200);
  });

  it("a deactivated admin loses admin access on the next request", async () => {
    const other = await makeAccount({ category: "Admin" });
    const asOther = appAs(routes, { id: other.id, category: "Admin", username: other.username }, "/api");
    expect((await request(asOther).get("/api/admin/customers")).status).toBe(200);
    await request(admin).patch(`/api/admin/customers/${other.id}`).send({ isActive: false });
    expect((await request(asOther).get("/api/admin/customers")).status).toBe(403);
  });
});
