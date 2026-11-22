import { describe, expect, it } from "vitest";
import { errorsUnder, getAt, setAt } from "./paths";

describe("paths", () => {
  it("sets deep values without mutating", () => {
    const a = { items: [{ title: "A" }, { title: "B" }], x: 1 };
    const b = setAt(a, "items.1.title", "C");
    expect(b).toEqual({ items: [{ title: "A" }, { title: "C" }], x: 1 });
    expect(a.items[1].title).toBe("B");
    expect(b.items[0]).toBe(a.items[0]);
  });
  it("creates missing branches", () => {
    expect(setAt({}, "a.0.b", 1)).toEqual({ a: [{ b: 1 }] });
  });
  it("gets and checks errors", () => {
    expect(getAt({ a: [{ b: 2 }] }, "a.0.b")).toBe(2);
    expect(errorsUnder({ "lines.0.value": "Required" }, "lines")).toBe(true);
    expect(errorsUnder({ "lines.0.value": "Required" }, "lead")).toBe(false);
  });
});
