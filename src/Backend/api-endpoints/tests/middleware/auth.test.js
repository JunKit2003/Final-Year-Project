import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { requireAdmin, requireAuth, requireOwnCartItem, requireSelf } from "../../../middleware/auth.js";

const ADMIN = { id: 1, category: "Admin" };
const RIA = { id: 2, category: "Customer" };

// Tiny app: fake the session user from a header, then run the guard and echo what got through.
const appWith = (...guards) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const who = req.get("x-test-user");
    req.session = who ? { user: who === "admin" ? ADMIN : RIA } : {};
    next();
  });
  const echo = (req, res) => res.json({ body: req.body, params: req.params });
  app.post("/thing", ...guards, echo);
  app.get("/users/:userId", ...guards, echo);
  app.delete("/cart/:cart_item_id", ...guards, echo);
  return app;
};

describe("requireAuth", () => {
  it("401 when signed out, passes when signed in", async () => {
    const app = appWith(requireAuth);
    expect((await request(app).post("/thing")).status).toBe(401);
    expect((await request(app).post("/thing").set("x-test-user", "ria")).status).toBe(200);
  });
});

describe("requireAdmin", () => {
  it.each([
    [undefined, 401],
    ["ria", 403],
    ["admin", 200],
  ])("user %s -> %i", async (who, status) => {
    const req = request(appWith(requireAdmin)).post("/thing");
    expect((await (who ? req.set("x-test-user", who) : req)).status).toBe(status);
  });
});

describe("requireSelf", () => {
  const body = requireSelf("body", "user_id");

  it("rejects acting as another user", async () => {
    const res = await request(appWith(body)).post("/thing").set("x-test-user", "ria").send({ user_id: 1 });
    expect(res.status).toBe(403);
  });

  it("allows your own id, as number or string", async () => {
    for (const id of [2, "2"]) {
      const res = await request(appWith(body)).post("/thing").set("x-test-user", "ria").send({ user_id: id });
      expect(res.status).toBe(200);
    }
  });

  it("pins a missing id to the signed-in user", async () => {
    const res = await request(appWith(body)).post("/thing").set("x-test-user", "ria").send({});
    expect(res.body.body.user_id).toBe(2);
  });

  it("does not let admins act for others unless allowed", async () => {
    const res = await request(appWith(body)).post("/thing").set("x-test-user", "admin").send({ user_id: 2 });
    expect(res.status).toBe(403);
    const ok = await request(appWith(requireSelf("params", "userId", { allowAdmin: true }))).get("/users/2").set("x-test-user", "admin");
    expect(ok.status).toBe(200);
  });

  it("checks route params too", async () => {
    const guard = requireSelf("params", "userId");
    expect((await request(appWith(guard)).get("/users/1").set("x-test-user", "ria")).status).toBe(403);
    expect((await request(appWith(guard)).get("/users/2").set("x-test-user", "ria")).status).toBe(200);
    expect((await request(appWith(guard)).get("/users/2")).status).toBe(401);
  });
});

describe("requireOwnCartItem", () => {
  const find = vi.fn(async (id) => ({ 10: { id: 10, accountId: 2 }, 11: { id: 11, accountId: 1 } })[id] || null);
  const guard = requireOwnCartItem(find);

  it("lets you remove your own line", async () => {
    expect((await request(appWith(guard)).delete("/cart/10").set("x-test-user", "ria")).status).toBe(200);
  });

  it("hides other people's lines and missing ones behind the same 404", async () => {
    expect((await request(appWith(guard)).delete("/cart/11").set("x-test-user", "ria")).status).toBe(404);
    expect((await request(appWith(guard)).delete("/cart/99").set("x-test-user", "ria")).status).toBe(404);
  });

  it("401 when signed out", async () => {
    expect((await request(appWith(guard)).delete("/cart/10")).status).toBe(401);
  });
});
