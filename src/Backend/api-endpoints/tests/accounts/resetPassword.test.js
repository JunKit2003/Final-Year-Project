import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";
import bcrypt from "bcrypt";
import { db } from "../../../database/index.js"; // Ensure correct path
import resetPassword from "../../accounts/resetPassword.js"; // Adjust path if needed

// 1️⃣ Mock database methods
const mockUser = {
  email: "test@example.com",
  password_reset_token: "valid-reset-code",
  password_reset_token_expiration: new Date(Date.now() + 1000 * 60 * 15), // 15 mins ahead
  password: "oldHashedPassword",
  save: vi.fn(),
};
vi.spyOn(db.Account, "findOne");

// 2️⃣ Create an Express app
const app = express();
app.use(express.json());

// Route for resetPassword
app.post("/resetPassword", (req, res) => resetPassword(req, res));

// 3️⃣ Ensure DB is Ready Before Tests
beforeAll(async () => {
  // Verifies DB connection
  await db.sequelize.authenticate();
  // Syncs all models without wiping data
  await db.sequelize.sync({ force: false });
});

afterAll(async () => {
  // Closes DB connection after all tests
  await db.sequelize.close();
});

describe("resetPassword API Tests", () => {
  it("should return 400 if required fields are missing", async () => {
    const response = await request(app).post("/resetPassword").send({});
    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("success", false);
    expect(response.body).toHaveProperty(
      "message",
      "All fields (email, code, newPassword) are required."
    );
  });

  it("should return 400 if email is not registered", async () => {
    db.Account.findOne.mockResolvedValue(null);

    const response = await request(app).post("/resetPassword").send({
      email: "notfound@example.com",
      code: "randomCode",
      newPassword: "newSecurePass123",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("success", false);
    expect(response.body).toHaveProperty("message", "Invalid email or code.");
  });

  it("should return 400 if reset code is incorrect", async () => {
    const user = { ...mockUser, password_reset_token: "different-code" };
    db.Account.findOne.mockResolvedValue(user);

    const response = await request(app).post("/resetPassword").send({
      email: "test@example.com",
      code: "wrong-reset-code",
      newPassword: "newSecurePass123",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("success", false);
    expect(response.body).toHaveProperty("message", "Invalid or expired reset code.");
  });

  it("should return 400 if reset code is expired", async () => {
    const expiredUser = {
      ...mockUser,
      password_reset_token_expiration: new Date(Date.now() - 1000 * 60), // Expired token
    };
    db.Account.findOne.mockResolvedValue(expiredUser);

    const response = await request(app).post("/resetPassword").send({
      email: "test@example.com",
      code: "valid-reset-code",
      newPassword: "newSecurePass123",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("success", false);
    expect(response.body).toHaveProperty("message", "Reset code expired.");
  });

  it("should return 400 if new password is too short", async () => {
    db.Account.findOne.mockResolvedValue(mockUser);

    const response = await request(app).post("/resetPassword").send({
      email: "test@example.com",
      code: "valid-reset-code",
      newPassword: "123",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("success", false);
    expect(response.body).toHaveProperty("message", "Password must be at least 6 characters.");
  });

  it("should return 200 on successful password reset", async () => {
    db.Account.findOne.mockResolvedValue(mockUser);
    mockUser.save.mockClear();
    vi.spyOn(bcrypt, "hash").mockResolvedValue("newHashedPassword123");

    const response = await request(app).post("/resetPassword").send({
      email: "test@example.com",
      code: "valid-reset-code",
      newPassword: "NewSecurePass123",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty(
      "message",
      "Your password has been reset successfully!"
    );

    // Check that password is hashed
    expect(bcrypt.hash).toHaveBeenCalledWith("NewSecurePass123", 10);
    expect(mockUser.password).toBe("newHashedPassword123");

    // Check token cleared
    expect(mockUser.password_reset_token).toBeNull();
    expect(mockUser.password_reset_token_expiration).toBeNull();

    // Ensure save was called
    expect(mockUser.save).toHaveBeenCalledTimes(1);
  });
});
