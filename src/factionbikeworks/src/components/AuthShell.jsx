import { useEffect, useState } from "react";
import api, { assetUrl } from "../lib/api";
import { Torx } from "./ui/Icons";
import { Markup } from "./ui/Markup";
import { useSite } from "../lib/site";

/**
 * Split layout for sign-in pages: shop photo + big type on one side, form on the other.
 * `page` is "login" | "signup" | "reset" in the content.auth settings.
 */
export default function AuthShell({ page, children }) {
  const auth = useSite()["content.auth"];
  const { kicker, lines: headLines } = auth[page];
  const lines = headLines.map((l) => l.value);
  const [banner, setBanner] = useState(null);
  useEffect(() => {
    if (auth.photo) return undefined;
    let live = true;
    api
      .post("/api/banner/get", {})
      .then((res) => live && setBanner(assetUrl(res.data?.banners?.[0]?.imageUrl)))
      .catch(() => live && setBanner(null));
    return () => {
      live = false;
    };
  }, [auth.photo]);
  const photo = auth.photo ? assetUrl(auth.photo) : banner;

  return (
    <div className="page auth">
      <div className="auth-art topo" style={photo ? { "--photo": `url("${photo}")` } : undefined}>
        <div className="auth-art-copy">
          <p className="kicker">{kicker}</p>
          <h1 className="display auth-display">
            {lines.map((l, i) => (
              <span className="line" key={`${i}${l}`}>
                <span style={{ animationDelay: `${80 + i * 110}ms` }}>
                  <Markup text={l} />
                </span>
              </span>
            ))}
          </h1>
        </div>
        <Torx className="auth-torx" />
      </div>
      <div className="auth-panel">
        <div className="auth-form fade-up">{children}</div>
      </div>
    </div>
  );
}

export function Field({ id, label, type = "text", value, onChange, auto, required = true, children, ...rest }) {
  const [show, setShow] = useState(false);
  const isPw = type === "password";
  return (
    <div className="field">
      <input id={id} name={id} type={isPw && show ? "text" : type} value={value} onChange={onChange} autoComplete={auto} placeholder=" " required={required} {...rest} />
      <label htmlFor={id}>{label}</label>
      {isPw && (
        <button type="button" className="field-toggle" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
          {show ? "Hide" : "Show"}
        </button>
      )}
      {children}
    </div>
  );
}
