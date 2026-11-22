// Thin client for /api/admin/*. Every failure becomes an AdminError with the server's
// message, field errors and code, so screens can show them next to the right field.
import api from "../../lib/api";

export class AdminError extends Error {
  constructor({ status = 0, code = null, message, errors = null, body = null }) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
    this.body = body;
  }
  get isConflict() {
    return this.status === 409;
  }
}

export function toAdminError(error) {
  if (error instanceof AdminError) return error;
  const res = error?.response;
  if (!res) return new AdminError({ message: "Can't reach the server. Check your connection and try again." });
  const body = res.data && typeof res.data === "object" ? res.data : {};
  return new AdminError({
    status: res.status,
    code: body.code || null,
    errors: body.errors || null,
    body,
    message: body.message || (res.status === 403 ? "Admin access required." : "Something went wrong. Please try again."),
  });
}

const call = (method) => async (path, data, config) => {
  try {
    const res = await api.request({ method, url: `/api/admin${path}`, data, ...config });
    return res.data;
  } catch (error) {
    throw toAdminError(error);
  }
};

export const adminApi = {
  get: (path, params) => call("get")(path, undefined, { params }),
  post: call("post"),
  put: call("put"),
  patch: call("patch"),
  del: call("delete"),
  /** multipart upload: fields is { name: value }, files go under `file`. */
  upload: (path, file, fields = {}, method = "post") => {
    const form = new FormData();
    if (file) form.append("file", file);
    for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null) form.append(k, String(v));
    return call(method)(path, form, { headers: { "Content-Type": "multipart/form-data" } });
  },
  /** Raw text download (CSV). */
  download: async (path, filename) => {
    try {
      const res = await api.get(`/api/admin${path}`, { responseType: "blob" });
      const href = URL.createObjectURL(res.data);
      const a = Object.assign(document.createElement("a"), { href, download: filename });
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
    } catch (error) {
      throw toAdminError(error);
    }
  },
};
