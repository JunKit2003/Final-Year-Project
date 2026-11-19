import { useEffect, useState } from "react";
import api, { assetUrl } from "../lib/api";
import { Torx } from "./ui/Icons";

/** Split layout for sign-in pages: shop photo + big type on one side, form on the other. */
export default function AuthShell({ kicker, lines, outline = [], children }) {
  const [photo, setPhoto] = useState(null);
  useEffect(() => {
    api
      .post("/api/banner/get", {})
      .then((res) => setPhoto(assetUrl(res.data?.banners?.[0]?.imageUrl)))
      .catch(() => setPhoto(null));
  }, []);

  return (
    <div className="page auth">
      <div className="auth-art topo" style={photo ? { "--photo": `url("${photo}")` } : undefined}>
        <div className="auth-art-copy">
          <p className="kicker">{kicker}</p>
          <h1 className="display auth-display">
            {lines.map((l, i) => (
              <span className="line" key={l}>
                <span className={outline.includes(i) ? "outline" : ""} style={{ animationDelay: `${80 + i * 110}ms` }}>
                  {l}
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
