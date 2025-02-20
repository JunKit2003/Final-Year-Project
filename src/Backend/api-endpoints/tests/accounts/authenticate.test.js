import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import session from "express-session";
import SequelizeStore from "connect-session-sequelize";
import { db } from "../../../database/index.js"; // Ensure correct import
import authenticate from "../../accounts/authenticate.js";

// Initialize Sequelize Store
const SequelizeSessionStore = SequelizeStore(session.Store);
const sessionStore = new SequelizeSessionStore({
  db: db.sequelize,
});

// Create Express app
const app = express();
app.use(express.json());

// Apply session middleware (with Sequelize store)
app.use(
  session({
    secret: "test_secret",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

// Manually set session data
app.post("/set-session", (req, res) => {
  req.session.user = req.body.user;
  res.send({ message: "Session set", user: req.session.user });
});

// Define authentication route
app.get("/authenticate", (req, res) => authenticate(req, res));

// Sync database and session store before tests
beforeAll(async () => {
  await db.sequelize.sync({ force: false });
  await sessionStore.sync();
});

afterAll(async () => {
  await db.sequelize.close();
});

describe("Authentication API Tests", () => {
  it("should return 401 if user is not logged in", async () => {
    const response = await request(app).get("/authenticate");
    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty("message", "User not logged in");
  });

  it("should return 200 for Admin user", async () => {
    const agent = request.agent(app); // Persistent session

    // Set session before testing
    await agent.post("/set-session").send({ user: { category: "Admin" } });

    const response = await agent.get("/authenticate");

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("message", "Admin user logged in");
    expect(response.body).toHaveProperty("user");
  });

  it("should return 200 for Customer user", async () => {
    const agent = request.agent(app);

    await agent.post("/set-session").send({ user: { category: "Customer" } });

    const response = await agent.get("/authenticate");

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("message", "Customer user logged in");
    expect(response.body).toHaveProperty("user");
  });

  it("should return 403 for an unknown role", async () => {
    const agent = request.agent(app);

    await agent.post("/set-session").send({ user: { category: "UnknownRole" } });

    const response = await agent.get("/authenticate");

    expect(response.statusCode).toBe(403);
    expect(response.body).toHaveProperty("message", "Access denied: User role not recognized");
  });
});
