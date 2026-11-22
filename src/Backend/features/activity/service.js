import { db } from "../../database/index.js";

/** Record an admin change. Never throws: logging must not break the action. */
export async function logActivity({ actor, action, entity = null, entityId = null, summary }, { transaction } = {}) {
  try {
    await db.AdminActivity.create(
      { actorId: actor?.id ?? null, actorName: actor?.username ?? null, action, entity, entityId: entityId == null ? null : String(entityId), summary: String(summary).slice(0, 300) },
      { transaction }
    );
  } catch (error) {
    console.error("Could not record admin activity:", error);
  }
}

export async function listActivity({ limit, offset }) {
  const { rows, count } = await db.AdminActivity.findAndCountAll({ order: [["createdAt", "DESC"], ["id", "DESC"]], limit, offset });
  return { items: rows.map((r) => r.toJSON()), total: Math.min(count, 500) };
}
