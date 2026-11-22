// Admin API guard. Unlike the session-only requireAdmin, this re-reads the account, so an
// admin who is demoted or deactivated loses access on their next request.
import { db } from "../database/index.js";

export async function requireActiveAdmin(req, res, next) {
  const user = req.session?.user;
  if (!user) return res.status(401).json({ message: "Please sign in to continue." });
  try {
    const acct = await db.Account.findByPk(user.id, { attributes: ["id", "category", "isActive", "username"] });
    if (!acct || acct.category !== "Admin" || acct.isActive === false) return res.status(403).json({ message: "Admin access required." });
    req.session.user = { ...user, category: acct.category, username: acct.username };
    return next();
  } catch (error) {
    return next(error);
  }
}
