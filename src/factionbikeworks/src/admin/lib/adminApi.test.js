import { describe, expect, it } from "vitest";
import { toAdminError } from "./adminApi";

describe("toAdminError", () => {
  it("maps a version conflict", () => {
    const e = toAdminError({ response: { status: 409, data: { code: "version_conflict", message: "Someone else saved this." } } });
    expect(e).toMatchObject({ status: 409, code: "version_conflict", message: "Someone else saved this." });
    expect(e.isConflict).toBe(true);
  });
  it("keeps field errors", () => {
    const e = toAdminError({ response: { status: 400, data: { message: "Fix it", errors: { name: "Name is required" } } } });
    expect(e.errors).toEqual({ name: "Name is required" });
  });
  it("explains a network failure", () => {
    expect(toAdminError(new Error("Network Error")).message).toMatch(/Can't reach the server/);
  });
});
