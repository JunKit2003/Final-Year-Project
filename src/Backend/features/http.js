// Small HTTP helpers for the feature routers: typed errors mapped to JSON responses.
export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}
export class ValidationError extends HttpError {
  constructor(errors, message = "Please fix the highlighted fields.") {
    super(400, message, { errors });
  }
}
export class NotFoundError extends HttpError {
  constructor(message = "Not found.") {
    super(404, message);
  }
}
export class ConflictError extends HttpError {
  constructor(message, extra = {}) {
    super(409, message, extra);
  }
}
export class VersionConflictError extends ConflictError {
  constructor(message = "Someone else saved this since you opened it. Reload to see their changes.") {
    super(message, { code: "version_conflict" });
  }
}
export class ForbiddenError extends HttpError {
  constructor(message) {
    super(403, message);
  }
}

/** Wrap an async handler: HttpErrors become JSON, anything else a logged 500. */
export const asyncRoute = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.status).json({ message: error.message, ...error.extra });
    if (error?.name === "SequelizeValidationError" || error?.name === "SequelizeUniqueConstraintError") {
      const errors = {};
      for (const e of error.errors || []) errors[e.path] = e.message;
      return res.status(400).json({ message: "Please fix the highlighted fields.", errors });
    }
    console.error(`${req.method} ${req.originalUrl} failed:`, error);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};

export const actorOf = (req) => req.session?.user || null;

/** Positive integer id from a route param, or 404. */
export function idParam(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new NotFoundError();
  return n;
}

/** page/pageSize from a query string. */
export function paging(query, { pageSize = 25, max = 100 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const size = Math.min(max, Math.max(1, Number.parseInt(query.pageSize, 10) || pageSize));
  return { page, pageSize: size, limit: size, offset: (page - 1) * size };
}
