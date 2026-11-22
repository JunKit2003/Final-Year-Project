// Immutable get/set by dotted path ("items.1.title"), for schema-driven forms.
export const getAt = (obj, path) => (path ? path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj) : obj);

export function setAt(obj, path, value) {
  const [head, ...rest] = path.split(".");
  const isIndex = /^\d+$/.test(head);
  const base = obj ?? (isIndex ? [] : {});
  const copy = Array.isArray(base) ? [...base] : { ...base };
  copy[isIndex ? Number(head) : head] = rest.length ? setAt(base[isIndex ? Number(head) : head], rest.join("."), value) : value;
  return copy;
}

/** Errors for paths at or under `prefix`. */
export const errorsUnder = (errors, prefix) => Object.keys(errors || {}).some((k) => k === prefix || k.startsWith(`${prefix}.`));
