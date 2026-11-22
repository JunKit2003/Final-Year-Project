import { describe, expect, it } from "vitest";
import { GROUPS } from "../../../../../shared/site-schema.js";
import { CONTENT_PAGES } from "../../nav";
import { CONTENT_GROUPS } from "./contentPages";

describe("content pages", () => {
  it("home lists its seven sections in page order", () => {
    expect(CONTENT_GROUPS.home.map((k) => GROUPS[k].label)).toEqual(["Hero", "Brand wall", "Fresh in", "Categories", "Promise strip", "Numbers", "Visit us"]);
  });
  it("every content group is on exactly one page", () => {
    const all = Object.values(CONTENT_GROUPS).flat();
    expect(new Set(all).size).toBe(all.length);
    expect(all.sort()).toEqual(Object.keys(GROUPS).filter((k) => k.startsWith("content.")).sort());
    expect(CONTENT_PAGES.map((p) => p.key).sort()).toEqual(Object.keys(CONTENT_GROUPS).sort());
  });
});
