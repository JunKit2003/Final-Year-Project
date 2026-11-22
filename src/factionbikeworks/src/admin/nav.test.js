import { describe, expect, it } from "vitest";
import { ADMIN_NAV } from "./nav";

describe("admin nav", () => {
  it("lists the design's sections in order", () => {
    expect(ADMIN_NAV.map((n) => n.label)).toEqual([
      "Dashboard", "Orders", "Products", "Stock", "Categories & brands", "Banners", "Site content", "Shop settings", "Customers", "Activity",
    ]);
  });
});
