import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";
import { db } from "../../../database/index.js"; // Ensure correct path
import signup from "../../accounts/signup.js"; // Adjust path if needed

// 🔥 Mock database functions
vi.spyOn(db.Account, "findOne");
vi.spyOn(db.Account, "create");

// 📌 Setup Express app
const app = express();
app.use(express.json());

// Define signup route
app.post("/signup", (req, res) => signup(req, res));

// 🔄 Ensure DB is ready
beforeAll(async () => {
  // Verify DB connection
  await db.sequelize.authenticate();
  // Sync models without wiping data
  await db.sequelize.sync({ force: false });
});

afterAll(async () => {
  // Close DB connection
  await db.sequelize.close();
});

describe("Signup API Tests", () => {
  it("should return 400 if required fields are missing", async () => {
    const response = await request(app).post("/signup").send({});
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  it("should return 400 if username is already taken", async () => {
    db.Account.findOne.mockResolvedValueOnce({ username: "existing_user" });

    const response = await request(app).post("/signup").send({
      username: "existing_user",
      email: "test@example.com",
      password: "password123",
      first_name: "John",
      last_name: "Doe",
      phone_number: "1234567890",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Username is already taken.");
  });

  it("should return 400 if email is already registered", async () => {
    db.Account.findOne.mockResolvedValueOnce(null); // Username doesn't exist
    db.Account.findOne.mockResolvedValueOnce({ email: "test@example.com" });

    const response = await request(app).post("/signup").send({
      username: "new_user",
      email: "test@example.com",
      password: "password123",
      first_name: "John",
      last_name: "Doe",
      phone_number: "1234567890",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Email is already registered.");
  });

  it("should return 400 if phone number is already registered", async () => {
    db.Account.findOne.mockResolvedValueOnce(null); // Username doesn't exist
    db.Account.findOne.mockResolvedValueOnce(null); // Email doesn't exist
    db.Account.findOne.mockResolvedValueOnce({ phone_number: "1234567890" });

    const response = await request(app).post("/signup").send({
      username: "new_user",
      email: "new@example.com",
      password: "password123",
      first_name: "John",
      last_name: "Doe",
      phone_number: "1234567890",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Phone number is already registered.");
  });

  it("should return 201 on successful signup", async () => {
    // Ensure username, email, and phone don't exist
    db.Account.findOne.mockResolvedValueOnce(null);
    db.Account.findOne.mockResolvedValueOnce(null);
    db.Account.findOne.mockResolvedValueOnce(null);

    const mockNewUser = {
      id: 1,
      username: "new_user",
      email: "new@example.com",
      first_name: "John",
      last_name: "Doe",
      phone_number: "1234567890",
      category: "customer",
    };

    db.Account.create.mockResolvedValueOnce(mockNewUser);

    const response = await request(app).post("/signup").send({
      username: "new_user",
      email: "new@example.com",
      password: "password123",
      first_name: "John",
      last_name: "Doe",
      phone_number: "1234567890",
    });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty(
      "message",
      "Signup successful! Please login to continue."
    );
    expect(response.body).toHaveProperty("user");
    expect(response.body.user).toMatchObject({
      id: mockNewUser.id,
      username: mockNewUser.username,
      email: mockNewUser.email,
      first_name: mockNewUser.first_name,
      last_name: mockNewUser.last_name,
      phone_number: mockNewUser.phone_number,
      category: mockNewUser.category,
    });
  });
});
