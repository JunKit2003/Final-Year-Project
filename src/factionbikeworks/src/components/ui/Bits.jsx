import { Link } from "react-router";
import { Chat, Torx } from "./Icons";

export function Loader({ label = "Loading" }) {
  return (
    <div className="center-screen" role="status">
      <Torx className="torx-loader" />
      <p className="mono dim">{label}…</p>
    </div>
  );
}

export function Empty({ kicker, title, children, action }) {
  return (
    <div className="empty topo">
      {kicker && <p className="kicker">{kicker}</p>}
      <h2 className="h2">{title}</h2>
      {children && <p className="lead">{children}</p>}
      {action}
    </div>
  );
}

/** Big type-led page header. */
export function PageHead({ kicker, lines, outline = [], lead, children }) {
  return (
    <header className="page-head topo">
      <div className="wrap page-head-inner">
        {kicker && <p className="kicker fade-up">{kicker}</p>}
        <h1 className="h1">
          {lines.map((l, i) => (
            <span className="line" key={l}>
              <span className={outline.includes(i) ? "outline" : ""} style={{ animationDelay: `${80 + i * 100}ms` }}>
                {l}
              </span>
            </span>
          ))}
        </h1>
        {lead && (
          <p className="lead fade-up" style={{ animationDelay: "380ms" }}>
            {lead}
          </p>
        )}
        {children}
      </div>
    </header>
  );
}

export function Marquee({ items, reverse = false, speed = 38 }) {
  const row = (
    <div className="marquee-row">
      {items.map((it, i) => (
        <span className="marquee-item" key={i}>
          {it}
          <Torx className="marquee-torx" />
        </span>
      ))}
    </div>
  );
  return (
    <div className={`marquee ${reverse ? "is-reverse" : ""}`} style={{ "--speed": `${speed}s` }} aria-hidden>
      <div className="marquee-track">
        {row}
        {row}
      </div>
    </div>
  );
}

/** Floating launcher for the Botpress mechanic chat. */
export function ChatLauncher() {
  return (
    <Link to="/chatbot" className="chat-fab" aria-label="Ask the mechanic">
      <Chat />
      <span>Ask the mechanic</span>
    </Link>
  );
}

export function Check({ checked, onChange, disabled, label }) {
  return (
    <label className="check" aria-label={label}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
      <span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
    </label>
  );
}
