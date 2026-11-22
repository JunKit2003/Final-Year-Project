import { Markup, SmartLink } from "../ui/Markup";

export function NotFoundBody({ content }) {
  return (
    <div className="center-screen page topo">
      {content.kicker && <p className="kicker">{content.kicker}</p>}
      <h1 className="display">
        <Markup text={content.title} />
      </h1>
      <SmartLink to={content.ctaLink} className="btn btn-primary">
        {content.ctaLabel}
      </SmartLink>
    </div>
  );
}
