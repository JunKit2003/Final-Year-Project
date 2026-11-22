import { createHash } from "crypto";
import { db } from "../../database/index.js";
import { DEFAULTS, GROUPS, mergeSite, validateGroup } from "../../../shared/site-schema.js";
import { NotFoundError, ValidationError, VersionConflictError } from "../http.js";
import { logActivity } from "../activity/service.js";

let cache = null; // { site, etag }
let generation = 0;

export function invalidateSite() {
  generation++;
  cache = null;
}

/** Merged site settings plus an ETag that changes on every save. */
export async function getSiteWithEtag() {
  if (cache) return cache;
  const started = generation;
  const rows = await db.SiteSetting.findAll();
  const stored = {};
  const stamp = [];
  for (const r of rows) {
    if (!GROUPS[r.key]) continue;
    stored[r.key] = r.value;
    stamp.push(`${r.key}:${r.version}`);
  }
  const site = mergeSite(stored);
  const etag = `"${createHash("sha1").update(stamp.sort().join("|")).digest("hex").slice(0, 16)}"`;
  const fresh = { site, etag };
  // A save that happened while this read ran wins: don't cache what may already be old.
  if (started === generation) cache = fresh;
  return fresh;
}

export const getSite = async () => (await getSiteWithEtag()).site;

export async function getGroup(key) {
  if (!GROUPS[key]) throw new NotFoundError("Unknown settings group.");
  const row = await db.SiteSetting.findByPk(key);
  const site = await getSite();
  return { key, label: GROUPS[key].label, value: site[key], version: row ? row.version : 1, updatedAt: row?.updatedAt ?? null, defaults: DEFAULTS[key] };
}

/** Replace one group. `version` must match the one the admin loaded. */
export async function saveGroup(key, value, version, actor) {
  if (!GROUPS[key]) throw new NotFoundError("Unknown settings group.");
  const result = validateGroup(key, value);
  if (!result.ok) throw new ValidationError(result.errors);
  const expected = Number(version);
  const saved = await db.sequelize.transaction(async (transaction) => {
    const row = await db.SiteSetting.findByPk(key, { transaction, lock: transaction.LOCK.UPDATE });
    const current = row ? row.version : 1;
    if (expected !== current) throw new VersionConflictError("Someone else saved these settings since you opened them. Reload to see their changes.");
    if (row) {
      await row.update({ value: result.value, version: current + 1, updatedBy: actor?.id ?? null }, { transaction });
      return row;
    }
    try {
      return await db.SiteSetting.create({ key, value: result.value, version: 2, updatedBy: actor?.id ?? null }, { transaction });
    } catch (error) {
      // Two first saves at once: the loser lost the race.
      if (error?.name === "SequelizeUniqueConstraintError") throw new VersionConflictError("Someone else saved these settings since you opened them. Reload to see their changes.");
      throw error;
    }
  });
  invalidateSite();
  await logActivity({ actor, action: "settings.update", entity: "settings", entityId: key, summary: `Updated ${GROUPS[key].label}` });
  return { key, value: saved.value, version: saved.version };
}
