// Site content and settings from /api/site. The bundled defaults render first, so the
// page never waits on the API; fetched values replace them as soon as they arrive.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "./api";
import { mergeSite, themeVars } from "../../../shared/site-schema.js";

const DEFAULT_SITE = mergeSite({});
const SiteContext = createContext({ site: DEFAULT_SITE, reload: () => {} });

/** CSS overriding the theme tokens for both modes. */
export function themeCss(theme) {
  const vars = themeVars(theme);
  const block = (sel, v) => `${sel}{${Object.entries(v).map(([k, val]) => `${k}:${val}`).join(";")}}`;
  return `${block(':root,[data-theme="dark"]', vars.dark)}${block('[data-theme="light"]', vars.light)}`;
}

/** Page title for a path: exact match first, then the default. */
export function titleFor(site, pathname) {
  const hit = site.seo.titles.find((t) => t.path === pathname);
  return hit ? hit.title : site.seo.defaultTitle;
}

export function SiteProvider({ children }) {
  const [site, setSite] = useState(DEFAULT_SITE);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    api
      .get("/api/site")
      .then((res) => live && res.data && typeof res.data === "object" && setSite(mergeSite(res.data)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [tick]);

  const css = useMemo(() => themeCss(site.theme), [site.theme]);
  useEffect(() => {
    let el = document.getElementById("site-theme");
    if (!el) {
      el = document.createElement("style");
      el.id = "site-theme";
      document.head.appendChild(el);
    }
    el.textContent = css;
  }, [css]);

  useEffect(() => {
    document.querySelector('meta[name="description"]')?.setAttribute("content", site.seo.metaDescription);
  }, [site.seo.metaDescription]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  const value = useMemo(() => ({ site, reload }), [site, reload]);
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

/** The merged site object: site.shop, site.hours, site["content.home.hero"], ... */
export const useSite = () => useContext(SiteContext).site;
export const useSiteReload = () => useContext(SiteContext).reload;
