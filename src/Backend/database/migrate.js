// Forward-only schema and data migrations (Umzug). Run on every start, after
// sequelize.sync() has created any missing tables. Every migration must be idempotent:
// a fresh database already has the new columns from sync, an old one doesn't.
import { readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { Umzug, SequelizeStorage } from "umzug";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export async function hasTable(qi, table) {
  const tables = await qi.showAllTables();
  return tables.map((t) => (typeof t === "string" ? t : t.tableName)).includes(table);
}

export async function hasColumn(qi, table, column) {
  if (!(await hasTable(qi, table))) return false;
  const cols = await qi.describeTable(table);
  return Object.prototype.hasOwnProperty.call(cols, column);
}

export async function hasIndex(qi, table, name) {
  if (!(await hasTable(qi, table))) return false;
  const indexes = await qi.showIndex(table);
  return indexes.some((i) => i.name === name);
}

/** Add each column that's missing. `columns` is { name: attributes }. */
export async function addMissingColumns(qi, table, columns) {
  for (const [name, attrs] of Object.entries(columns)) {
    if (!(await hasColumn(qi, table, name))) await qi.addColumn(table, name, attrs);
  }
}

export function makeUmzug(sequelize, db) {
  const files = readdirSync(migrationsDir).filter((f) => /^\d{3}-.*\.js$/.test(f)).sort();
  return new Umzug({
    migrations: files.map((file) => ({
      name: file.replace(/\.js$/, ""),
      up: async (params) => {
        const mod = await import(pathToFileURL(join(migrationsDir, file)).href);
        return mod.up(params);
      },
    })),
    context: { qi: sequelize.getQueryInterface(), sequelize, db },
    storage: new SequelizeStorage({ sequelize }),
    logger: undefined,
  });
}

/** Apply pending migrations; resolves to the names applied. */
export async function runMigrations(sequelize, db) {
  const applied = await makeUmzug(sequelize, db).up();
  if (applied.length) console.log(`Applied migrations: ${applied.map((m) => m.name).join(", ")}`);
  return applied.map((m) => m.name);
}
