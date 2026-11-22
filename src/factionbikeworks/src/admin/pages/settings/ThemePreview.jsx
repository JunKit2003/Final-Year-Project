import { BACKGROUNDS, contrast, deriveAccentText } from "../../../../../shared/site-schema.js";

const ok = (c) => c >= 4.5;

/** Swatches of the accent in both modes, with readability scores. */
export function ThemePreview({ theme }) {
  return (
    <div className="adm-stack">
      {["dark", "light"].map((mode) => {
        const t = theme[mode];
        const valid = /^#[0-9a-f]{6}$/i.test(t.accent) && /^#[0-9a-f]{6}$/i.test(t.accentInk);
        if (!valid) return null;
        const bg = BACKGROUNDS[mode];
        const text = deriveAccentText(t.accent, bg);
        const c1 = contrast(t.accentInk, t.accent);
        const c2 = contrast(text, bg);
        return (
          <div key={mode} className="adm-preview">
            <div className="adm-preview-label">
              <span>{mode === "dark" ? "Dark mode" : "Light mode"}</span>
            </div>
            <div style={{ background: bg, padding: 16, display: "grid", gap: 12 }}>
              <div className="adm-swatches">
                <span className="adm-swatch" style={{ background: t.accent, color: t.accentInk, borderColor: t.accent }}>
                  Shop the parts
                </span>
                <span className="adm-swatch" style={{ background: t.hot, color: "#fff", borderColor: t.hot }}>
                  Sale
                </span>
              </div>
              <p style={{ color: text, fontWeight: 700, margin: 0 }}>Accent text on the page</p>
              <p className="mono" style={{ fontSize: 12, color: mode === "dark" ? "#9ca191" : "#555", margin: 0 }}>
                Button text {c1.toFixed(1)}:1 {ok(c1) ? "✓" : "✗ needs 4.5"} · Accent text {c2.toFixed(1)}:1 {ok(c2) ? "✓" : "✗ needs 4.5"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
