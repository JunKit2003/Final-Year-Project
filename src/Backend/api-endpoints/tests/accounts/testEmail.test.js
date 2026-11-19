import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const sendMail = vi.fn();
vi.mock("../../../config/nodemailer.js", () => ({
  transporter: { sendMail: (...a) => sendMail(...a) },
  mailFrom: () => process.env.EMAIL_FROM || '"Faction Bikeworks" <noreply@junkit.work>',
}));

const { default: testEmail } = await import("../../accounts/testEmail.js");

const app = (user) => {
  const a = express();
  a.use((req, _res, next) => {
    req.session = { user };
    next();
  });
  a.post("/testEmail", testEmail);
  return a;
};

describe("testEmail", () => {
  afterEach(() => {
    sendMail.mockReset();
    vi.unstubAllEnvs();
  });

  it("sends to the signed-in admin from EMAIL_FROM and responds", async () => {
    vi.stubEnv("EMAIL_FROM", "Shop <noreply@junkit.my>");
    sendMail.mockResolvedValueOnce({ response: "250 OK" });
    const res = await request(app({ email: "boss@example.test" })).post("/testEmail");
    expect(res.status).toBe(200);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: "boss@example.test", from: "Shop <noreply@junkit.my>" }));
  });

  it("reports SMTP failures instead of hanging", async () => {
    sendMail.mockRejectedValueOnce(new Error("auth failed"));
    const res = await request(app({ email: "boss@example.test" })).post("/testEmail");
    expect(res.status).toBe(502);
  });

  it("400 when there is nobody to send to", async () => {
    const res = await request(app({})).post("/testEmail");
    expect(res.status).toBe(400);
    expect(sendMail).not.toHaveBeenCalled();
  });
});
