import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import session from "express-session";
import SequelizeStore from "connect-session-sequelize";
import { db } from "../../../database/index.js";
import logout from "../../accounts/logout.js"; // Existing logout function

// 1) Create a test-only /set-session route
function setTestSession(req, res) {
  req.session.user = req.body.user;
  res.status(200).json({ message: "Session set", user: req.session.user });
}

// 2) Set up an Express app with session middleware
const app = express();
app.use(express.json());

const SequelizeSessionStore = SequelizeStore(session.Store);
const sessionStore = new SequelizeSessionStore({
  db: db.sequelize,
});

app.use(
  session({
    secret: "test_secret",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production (HTTPS)
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

// 3) Define the test-only and logout routes
app.post("/set-session", setTestSession);
app.post("/logout", (req, res) => logout(req, res));

// 4) Sync DB before tests
beforeAll(async () => {
  await db.sequelize.sync({ force: false });
  await sessionStore.sync();
});

afterAll(async () => {
  await db.sequelize.close();
});

// ---------------- TESTS ----------------
describe("Logout API Tests", () => {
  it("should return 401 if no user is logged in", async () => {
    // No session set here
    const response = await request(app).post("/logout");
    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty("message", "No user logged in");
  });

  it("should return 200 on successful logout", async () => {
    const agent = request.agent(app); // Maintains cookies/session

    // 5) Manually set session with user data (simulate "logged-in" user)
    await agent.post("/set-session").send({
      user: {
        id: 1,
        username: "john_doe",
        category: "Customer",
      },
    });

    // 6) Now log out
    const logoutResponse = await agent.post("/logout");
    expect(logoutResponse.statusCode).toBe(200);
    expect(logoutResponse.body).toHaveProperty("message", "Logout successful!");
  });
});
