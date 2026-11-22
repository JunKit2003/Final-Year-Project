import { describe, expect, it } from "vitest";
import {
  DEFAULTS, GROUP_KEYS, contrast, deriveAccentText, mergeSite, parseMarkup, renderTemplate, shopStatus, validateGroup,
} from "../../../shared/site-schema.js";

describe("defaults", () => {
  it("every group's defaults are valid", () => {
    for (const key of GROUP_KEYS) {
      const r = validateGroup(key, DEFAULTS[key]);
      expect(r.errors, key).toBeUndefined();
      expect(r.value).toEqual(DEFAULTS[key]);
    }
  });
  it("mergeSite({}) equals the defaults", () => {
    expect(mergeSite({})).toEqual(DEFAULTS);
  });
  it("merges stored values over defaults, arrays replace", () => {
    const site = mergeSite({ shop: { phone: "+6012-345 6789" }, "content.home.promise": { items: [] } });
    expect(site.shop.phone).toBe("+6012-345 6789");
    expect(site.shop.name).toBe("Faction Bikeworks");
    expect(site["content.home.promise"].items).toEqual([]);
  });
});

describe("validateGroup", () => {
  it("refuses an empty required headline", () => {
    const hero = { ...DEFAULTS["content.home.hero"], lines: [{ value: "" }] };
    expect(validateGroup("content.home.hero", hero).errors).toEqual({ "lines.0.value": "Required" });
  });
  it("refuses javascript: links", () => {
    const hero = { ...DEFAULTS["content.home.hero"], primaryCta: { label: "Go", link: "javascript:alert(1)" } };
    expect(validateGroup("content.home.hero", hero).errors["primaryCta.link"]).toBe("Link must start with / or https://");
  });
  it("refuses protocol-relative links", () => {
    const hero = { ...DEFAULTS["content.home.hero"], primaryCta: { label: "Go", link: "//evil.test" } };
    expect(validateGroup("content.home.hero", hero).ok).toBe(false);
  });
  it("drops unknown keys", () => {
    expect(validateGroup("content.footer", { ...DEFAULTS["content.footer"], extra: 1 }).value.extra).toBeUndefined();
  });
  it("refuses unknown email placeholders", () => {
    const emails = { ...DEFAULTS.emails, orderShipped: { subject: "Hi", body: "Order {{foo}}" } };
    expect(validateGroup("emails", emails).errors["orderShipped.body"]).toBe("Unknown placeholder {{foo}}");
  });
  it("refuses an unreadable accent", () => {
    const theme = { ...DEFAULTS.theme, dark: { ...DEFAULTS.theme.dark, accent: "#1a1d17" } };
    expect(validateGroup("theme", theme).errors["dark.accentInk"]).toBe("Text on this colour is hard to read (1.1:1, needs 4.5:1)");
  });
  it("checks hours", () => {
    const days = DEFAULTS.hours.days.map((d, i) => (i === 1 ? { closed: false, open: "19:00", close: "11:00" } : d));
    expect(validateGroup("hours", { ...DEFAULTS.hours, days }).errors["days.1"]).toBe("Monday: closing must be after opening");
  });
});

describe("colour", () => {
  it("default accent is readable on dark", () => {
    expect(contrast("#c6ff3d", "#0b0c0a")).toBeGreaterThan(4.5);
  });
  it("darkens the accent for light backgrounds", () => {
    const t = deriveAccentText("#c6ff3d", "#f1f0ea");
    expect(contrast(t, "#f1f0ea")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("shopStatus", () => {
  const h = DEFAULTS.hours;
  it("follows the weekly hours in Malaysia time", () => {
    expect(shopStatus(h, new Date("2026-11-18T04:00:00Z")).open).toBe(true); // Wed 12:00 MYT
    expect(shopStatus(h, new Date("2026-11-18T12:00:00Z")).open).toBe(false); // Wed 20:00
    expect(shopStatus(h, new Date("2026-11-21T07:30:00Z")).open).toBe(true); // Sat 15:30
    expect(shopStatus(h, new Date("2026-11-21T08:30:00Z")).label).toBe("Closed now"); // Sat 16:30
    expect(shopStatus(h, new Date("2026-11-22T04:00:00Z")).label).toBe("Closed today, gone riding"); // Sun
  });
  it("closed dates win", () => {
    const hours = { ...h, closures: [{ date: "2026-12-25", reason: "Christmas ride" }] };
    expect(shopStatus(hours, new Date("2026-12-25T06:00:00Z")).label).toBe("Closed today: Christmas ride");
  });
});

describe("text", () => {
  it("renders placeholders", () => {
    expect(renderTemplate("Hi {{name}}, order {{orderId}} is on its way", { name: "Aiman", orderId: 123 })).toBe("Hi Aiman, order 123 is on its way");
  });
  it("parses title markup", () => {
    expect(parseMarkup("~Kiara~ dirt^.^")).toEqual([
      { text: "Kiara", style: "outline" },
      { text: " dirt", style: "plain" },
      { text: ".", style: "accent" },
    ]);
    expect(parseMarkup("Foot of ==Bukit Kiara==")).toEqual([
      { text: "Foot of ", style: "plain" },
      { text: "Bukit Kiara", style: "hl" },
    ]);
  });
});
