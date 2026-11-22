import { describe, expect, it } from "vitest";
import { db } from "../database/index.js";
import { runMigrations } from "../database/migrate.js";

describe("migrations", () => {
  it("applies nothing on a second run", async () => {
    await runMigrations(db.sequelize, db);
    expect(await runMigrations(db.sequelize, db)).toEqual([]);
  });

  it("records applied names in SequelizeMeta", async () => {
    const [rows] = await db.sequelize.query("SELECT name FROM SequelizeMeta");
    expect(rows.map((r) => r.name)).toContain("001-baseline");
  });
});
