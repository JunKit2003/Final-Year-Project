import { useThemeMode } from "../lib/store";
import { PageHead, headLines } from "../components/ui/Bits";
import { useSite } from "../lib/site";


export default function Chatbot() {
  const { mode } = useThemeMode();
  const { chatbot, shop } = useSite();
  return (
    <div className="page chatbot">
      <PageHead kicker={chatbot.head.kicker} lines={headLines(chatbot.head)} lead={chatbot.head.lead} />
      <div className="wrap section-sm">
        <div className="bot-frame">
          <div className="bot-bar">
            <span />
            <span />
            <span />
            <p className="mono dim">{chatbot.statusLine}</p>
          </div>
          <iframe
            src={chatbot.url}
            title={`${shop.name} AI chatbot`}
            allow="microphone; clipboard-read; clipboard-write"
            // The Botpress webchat is dark; invert it in light mode so it matches the site.
            style={{ filter: mode === "light" ? "invert(1) hue-rotate(180deg)" : "none" }}
          />
        </div>
      </div>
    </div>
  );
}
