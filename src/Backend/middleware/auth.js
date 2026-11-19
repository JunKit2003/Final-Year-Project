// Route guards. Identity always comes from the server-side session (set at login),
// never from ids the client sends in the body or URL.

const sessionUser = (req) => req.session?.user || null;
const isAdmin = (user) => user?.category === "Admin";

/** 401 unless signed in. */
export function requireAuth(req, res, next) {
  if (!sessionUser(req)) {
    return res.status(401).json({ message: "Please sign in to continue." });
  }
  return next();
}

/** 401 unless signed in, 403 unless an admin. */
export function requireAdmin(req, res, next) {
  const user = sessionUser(req);
  if (!user) return res.status(401).json({ message: "Please sign in to continue." });
  if (!isAdmin(user)) return res.status(403).json({ message: "Admin access required." });
  return next();
}

/**
 * The user id at req[source][key] must be the signed-in user.
 * With { allowAdmin: true } admins may act on any user's id (read-only views).
 */
export function requireSelf(source, key, { allowAdmin = false } = {}) {
  return (req, res, next) => {
    const user = sessionUser(req);
    if (!user) return res.status(401).json({ message: "Please sign in to continue." });
    if (allowAdmin && isAdmin(user)) return next();
    const claimed = req[source]?.[key];
    if (claimed === undefined || claimed === null || claimed === "") {
      // Missing id: let the handler's own validation answer (400), but pin it to the session user.
      req[source] = { ...req[source], [key]: user.id };
      return next();
    }
    if (String(claimed) !== String(user.id)) {
      return res.status(403).json({ message: "You can only access your own account." });
    }
    return next();
  };
}

/**
 * The cart line at req.params[param] must belong to the signed-in user.
 * `findCartItem(id)` resolves to a row with `accountId`, or null.
 */
export function requireOwnCartItem(findCartItem, param = "cart_item_id") {
  return async (req, res, next) => {
    const user = sessionUser(req);
    if (!user) return res.status(401).json({ message: "Please sign in to continue." });
    try {
      const item = await findCartItem(req.params[param]);
      // Same answer for "missing" and "someone else's" so ids can't be probed.
      if (!item || String(item.accountId) !== String(user.id)) {
        return res.status(404).json({ message: "Cart item not found." });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
