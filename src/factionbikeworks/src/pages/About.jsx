import { assetUrl } from "../lib/api";
import { useSite } from "../lib/site";
import { PageHead, headLines } from "../components/ui/Bits";
import { AboutContact, AboutFollow, AboutMarquee, AboutStory } from "../components/sections/About";
import { useBanners } from "./Home";

export default function About() {
  const site = useSite();
  const about = site["content.about"];
  const banners = useBanners();
  const photo = about.story.photo ? assetUrl(about.story.photo) : banners[0]?.src;
  return (
    <div className="page about">
      <PageHead kicker={about.head.kicker} lines={headLines(about.head)} lead={about.head.lead} />
      <AboutStory content={about.story} photo={photo} />
      <AboutMarquee content={about.marquee} />
      <AboutContact content={about.contact} shop={site.shop} hours={site.hours} />
      <AboutFollow content={about.follow} shop={site.shop} />
    </div>
  );
}
