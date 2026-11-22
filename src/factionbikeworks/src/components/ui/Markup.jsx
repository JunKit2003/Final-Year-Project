import { Link } from "react-router";
import { parseMarkup } from "../../../../shared/site-schema.js";

const CLASS = { outline: "outline", hl: "hl", accent: "accent" };

/** Renders title markup: ~outline~, ==highlight==, ^accent^. */
export function Markup({ text }) {
  return parseMarkup(text).map((p, i) =>
    p.style === "plain" ? (
      <span key={i}>{p.text}</span>
    ) : (
      <span key={i} className={CLASS[p.style]}>
        {p.text}
      </span>
    )
  );
}

/** Internal paths use the router; hashes and external links use a plain anchor. */
export function SmartLink({ to, children, ...rest }) {
  if (/^https?:\/\//.test(to)) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  if (to.includes("#")) {
    return (
      <a href={to} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} {...rest}>
      {children}
    </Link>
  );
}
