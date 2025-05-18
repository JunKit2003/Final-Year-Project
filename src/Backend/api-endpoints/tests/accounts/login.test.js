import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";
import session from "express-session";
import SequelizeStore from "connect-session-sequelize";
import bcrypt from "bcrypt";
import { db } from "../../../database/index.js"; // Ensure correct import
import login from "../../accounts/login.js"; // Import login function

// 🔥 Properly mock database utilities
vi.mock("../../../database/utils.js", async () => {
    const actual = await vi.importActual("../../../database/utils.js"); // Preserve real functions
    return {
        ...actual,
        pingDatabase: vi.fn(),
        getUserByUsernameOrEmail: vi.fn(),
        InputValidationError: class InputValidationError extends Error {},
        DatabaseConnectionError: class DatabaseConnectionError extends Error {},
    };
});

// Import mocked functions
import { pingDatabase, getUserByUsernameOrEmail, InputValidationError, DatabaseConnectionError } from "../../../database/utils.js";

// Mock user data
const mockUser = {
    id: 1,
    first_name: "John",
    last_name: "Doe",
    email: "john@example.com",
    username: "john_doe",
    category: "Customer",
    password: await bcrypt.hash("password123", 10), // Hashed password
};

// Initialize Sequelize Store
const SequelizeSessionStore = SequelizeStore(session.Store);
const sessionStore = new SequelizeSessionStore({
    db: db.sequelize,
});

// Create Express app
const app = express();
app.use(express.json());

// Apply session middleware
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

// Define login route
app.post("/login", (req, res) => login(req, res));

// Sync database before tests
beforeAll(async () => {
    await db.sequelize.sync({ force: false });
    await sessionStore.sync();
});

afterAll(async () => {
    await db.sequelize.close();
});

describe("Login API Tests", () => {
    it(
        "should return 400 if email/username or password is missing",
        async () => {
            const response = await request(app).post("/login").send({ emailOrUsername: "john_doe" });
            expect(response.statusCode).toBe(400);
            expect(response.body).toHaveProperty("message", "Email/Username and password are required.");
        },
        10000 // 🔥 Increased timeout to 10s
    );

    it("should return 400 if user does not exist", async () => {
        getUserByUsernameOrEmail.mockResolvedValue(null); // ✅ Ensure the mock is defined

        const response = await request(app)
            .post("/login")
            .send({ emailOrUsername: "not_exist", password: "password123" });

        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty("message", "Invalid email/username or password.");
    });

    it("should return 400 if password is incorrect", async () => {
        getUserByUsernameOrEmail.mockResolvedValue(mockUser); // ✅ Ensure user is found

        const response = await request(app)
            .post("/login")
            .send({ emailOrUsername: "john_doe", password: "wrongpassword" });

        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty("message", "Invalid email/username or password.");
    });

    it("should return 200 and store session on successful login", async () => {
        getUserByUsernameOrEmail.mockResolvedValue(mockUser); // ✅ Ensure user is found

        const agent = request.agent(app); // Persistent session

        const response = await agent
            .post("/login")
            .send({ emailOrUsername: "john_doe", password: "password123" });

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty("message", "Login successful!");
        expect(response.body).toHaveProperty("user");
        expect(response.body.user).toMatchObject({
            id: 1,
            first_name: "John",
            last_name: "Doe",
            email: "john@example.com",
            username: "john_doe",
            category: "Customer",
        });
    });


});
