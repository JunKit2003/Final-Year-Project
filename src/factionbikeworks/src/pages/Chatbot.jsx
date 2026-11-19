import { useThemeMode } from "../lib/store";
import { PageHead } from "../components/ui/Bits";

const BOT =
  "https://cdn.botpress.cloud/webchat/v2.2/shareable.html?configUrl=https://files.bpcontent.cloud/2025/02/02/18/20250202183140-YKDEBF3S.json";

export default function Chatbot() {
  const { mode } = useThemeMode();
  return (
    <div className="page chatbot">
      <PageHead kicker="AI mechanic" lines={["Ask the", "mechanic"]} outline={[1]} lead="Sizing, compatibility, set-up, what to upgrade first. Ask anything bike-related, any time." />
      <div className="wrap section-sm">
        <div className="bot-frame">
          <div className="bot-bar">
            <span />
            <span />
            <span />
            <p className="mono dim">faction-mechanic · online</p>
          </div>
          <iframe
            src={BOT}
            title="Faction Bikeworks AI chatbot"
            allow="microphone; clipboard-read; clipboard-write"
            // The Botpress webchat is dark; invert it in light mode so it matches the site.
            style={{ filter: mode === "light" ? "invert(1) hue-rotate(180deg)" : "none" }}
          />
        </div>
      </div>
    </div>
  );
}
