import { describe, expect, it } from "vitest";
import { mergeSite } from "../../../shared/site-schema.js";
import { themeCss, titleFor } from "./site";

describe("site helpers", () => {
  const site = mergeSite({});
  it("theme css carries the accent", () => {
    expect(themeCss(site.theme)).toContain("--accent:#c6ff3d");
    expect(themeCss(site.theme)).toContain('[data-theme="light"]{');
  });
  it("titles by path", () => {
    expect(titleFor(site, "/catalog")).toBe("Shop · Faction Bikeworks");
    expect(titleFor(site, "/viewProduct/3")).toBe("Faction Bikeworks · MTB parts, Bukit Kiara");
  });
});
