// Storefront sections rendered with unsaved values, so the admin sees the real thing.
import { BrandMarquee, BrandWall, CategoryGrid, FreshIn, HomeHero, Numbers, PromiseStrip, Visit } from "../../../components/sections/Home";
import { AboutContact, AboutFollow, AboutMarquee, AboutStory } from "../../../components/sections/About";
import { FooterBody } from "../../../components/Footer";
import { NotFoundBody } from "../../../components/sections/NotFound";
import { PageHead, headLines } from "../../../components/ui/Bits";
import { Markup } from "../../../components/ui/Markup";
import { assetUrl } from "../../../lib/api";

function Stage({ label, hidden, children, scale = 0.6 }) {
  return (
    <div className="adm-preview">
      <div className="adm-preview-label">
        <span>Preview · {label}</span>
        {hidden && <span>Hidden on the site</span>}
      </div>
      <div className="adm-preview-stage" style={{ zoom: scale, opacity: hidden ? 0.35 : 1 }} aria-hidden>
        {children}
      </div>
    </div>
  );
}

/** Preview for one content group. `site` is the merged site with drafts applied; `data` is live shop data. */
export function GroupPreview({ groupKey, site, data }) {
  const c = site[groupKey];
  const common = { shop: site.shop, hours: site.hours };
  switch (groupKey) {
    case "content.home.hero":
      return (
        <Stage label="Hero" hidden={!c.visible} scale={0.5}>
          <HomeHero content={{ ...c, visible: true }} {...common} banners={data.banners} productCount={data.products.length} brandCount={data.brandNames.length} />
        </Stage>
      );
    case "content.home.brands":
      return (
        <Stage label="Brand wall" hidden={!c.visible}>
          <BrandMarquee content={{ ...c, visible: true }} names={data.brandNames} />
          <BrandWall content={{ ...c, visible: true }} brands={data.brands.slice(0, 6)} />
        </Stage>
      );
    case "content.home.fresh":
      return (
        <Stage label="Fresh in" hidden={!c.visible} scale={0.5}>
          <FreshIn content={{ ...c, visible: true, count: Math.min(c.count, 4) }} products={data.fresh} loading={data.loading} />
        </Stage>
      );
    case "content.home.categories":
      return (
        <Stage label="Categories" hidden={!c.visible} scale={0.5}>
          <CategoryGrid content={{ ...c, visible: true }} categories={data.categories} />
        </Stage>
      );
    case "content.home.promise":
      return (
        <Stage label="Promise strip" hidden={!c.visible}>
          <PromiseStrip content={{ ...c, visible: true }} />
        </Stage>
      );
    case "content.home.numbers":
      return (
        <Stage label="Numbers" hidden={!c.visible}>
          <Numbers content={{ ...c, visible: true }} shop={site.shop} productCount={data.products.length} brandCount={data.brandNames.length} />
        </Stage>
      );
    case "content.home.visit":
      return (
        <Stage label="Visit us" hidden={!c.visible} scale={0.5}>
          <Visit content={{ ...c, visible: true }} {...common} />
        </Stage>
      );
    case "content.about":
      return (
        <Stage label="About page" scale={0.5}>
          <PageHead kicker={c.head.kicker} lines={headLines(c.head)} lead={c.head.lead} />
          <AboutStory content={c.story} photo={c.story.photo ? assetUrl(c.story.photo) : data.banners[0]?.src} />
          <AboutMarquee content={c.marquee} />
          <AboutContact content={c.contact} {...common} />
          <AboutFollow content={c.follow} shop={site.shop} />
        </Stage>
      );
    case "content.header":
      return (
        <Stage label="Menu" scale={0.8}>
          <nav className="nav-links" style={{ display: "flex", gap: 24, padding: 20 }}>
            {c.links.map((l, i) => (
              <span key={i} className="nav-link">
                {l.label}
              </span>
            ))}
          </nav>
        </Stage>
      );
    case "content.footer":
      return (
        <Stage label="Footer" scale={0.5}>
          <FooterBody content={c} {...common} chatLabel={site.chatbot.launcherLabel} />
        </Stage>
      );
    case "content.notFound":
      return (
        <Stage label="404 page" scale={0.5}>
          <NotFoundBody content={c} />
        </Stage>
      );
    case "content.pages":
      return (
        <Stage label="Page headings" scale={0.5}>
          {["catalog", "cart", "checkout", "orders"].map((k) => (
            <PageHead key={k} kicker={c[k].kicker} lines={headLines(c[k])} lead={c[k].lead} />
          ))}
        </Stage>
      );
    case "content.auth":
      return (
        <Stage label="Sign-in pages" scale={0.6}>
          <div style={{ display: "grid", gap: 24, padding: 24 }}>
            {["login", "signup", "reset"].map((k) => (
              <div key={k}>
                <p className="kicker">{c[k].kicker}</p>
                <h1 className="display auth-display">
                  {c[k].lines.map((l, i) => (
                    <span className="line" key={i}>
                      <span>
                        <Markup text={l.value} />
                      </span>
                    </span>
                  ))}
                </h1>
              </div>
            ))}
          </div>
        </Stage>
      );
    default:
      return null;
  }
}
