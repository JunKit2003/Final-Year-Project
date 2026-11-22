import { useCallback, useEffect, useRef, useState } from "react";
import { toAdminError } from "./adminApi";

/** Load data on mount and whenever `deps` change. `reload()` refetches without clearing. */
export function useAdminQuery(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  useEffect(() => {
    let live = true;
    Promise.resolve()
      .then(() => fnRef.current())
      .then((data) => live && setState({ data, error: null, loading: false }))
      .catch((e) => live && setState((s) => ({ data: s.data, error: toAdminError(e), loading: false })));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  const setData = useCallback((updater) => setState((s) => ({ ...s, data: typeof updater === "function" ? updater(s.data) : updater })), []);
  return { ...state, reload, setData };
}

/** Wrap an async action: `pending` while it runs; rethrows AdminError. */
export function useAdminMutation(fn) {
  const [pending, setPending] = useState(false);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  const run = useCallback(async (...args) => {
    setPending(true);
    try {
      return await fnRef.current(...args);
    } catch (e) {
      throw toAdminError(e);
    } finally {
      setPending(false);
    }
  }, []);
  return { run, pending };
}

/** Debounce a fast-changing value (search boxes). */
export function useDebounced(value, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
