import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";
import { db } from "../../../database/index.js"; // Adjust if needed
import { transporter } from "../../../config/nodemailer.js"; // Adjust if needed
import requestPasswordReset from "../../accounts/requestPasswordReset.js"; // Adjust path if needed

// 1️⃣ Mock nodemailer transporter
vi.mock("../../../config/nodemailer.js", () => {
  return {
    transporter: {
      sendMail: vi.fn(),
    },
    // config/nodemailer.js now also exports the configurable sender.
    mailFrom: () => '"Faction Bikeworks" <noreply@junkit.work>',
  };
});

// 2️⃣ Mock db methods
const mockUser = {
  email: "test@example.com",
  password_reset_token: null,
  password_reset_token_expiration: null,
  save: vi.fn(),
};
vi.spyOn(db.Account, "findOne"); // We'll configure it in each test

// 3️⃣ Create an Express app with the route to test
const app = express();
app.use(express.json());

// Define route for request-password-reset
app.post("/requestPasswordReset", (req, res) => requestPasswordReset(req, res));

// 4️⃣ (Optional) If you need DB sync before/after tests
beforeAll(async () => {
  // e.g., await db.sequelize.sync({ force: false });
});
afterAll(async () => {
  // e.g., await db.sequelize.close();
});

describe("requestPasswordReset API Tests", () => {
  it("should return 200 if user not found (no error, for security)", async () => {
    // Mock findOne to return null
    db.Account.findOne.mockResolvedValue(null);

    const response = await request(app)
      .post("/requestPasswordReset")
      .send({ email: "notfound@example.com" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty(
      "message",
      "If this email is registered, a reset link has been sent."
    );
    // Ensure no mail is sent in this case
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });

  it("should return 200 and send reset token if user is found", async () => {
    // Reset mocks
    transporter.sendMail.mockClear();
    mockUser.save.mockClear();

    // Mock findOne to return an existing user
    db.Account.findOne.mockResolvedValue(mockUser);

    const response = await request(app)
      .post("/requestPasswordReset")
      .send({ email: "test@example.com" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("message", "Reset code sent to your email.");

    // Check that token was generated and saved
    expect(mockUser.save).toHaveBeenCalledTimes(1);
    expect(mockUser.password_reset_token).toBeDefined();
    expect(mockUser.password_reset_token_expiration).toBeInstanceOf(Date);

    // Check that transporter was called
    expect(transporter.sendMail).toHaveBeenCalledTimes(1);
    const mailOptions = transporter.sendMail.mock.calls[0][0];
    expect(mailOptions).toMatchObject({
      to: "test@example.com",
      subject: "Password Reset Request",
    });
    // The text should contain the token
    expect(mailOptions.text).toContain(mockUser.password_reset_token);
  });
});
