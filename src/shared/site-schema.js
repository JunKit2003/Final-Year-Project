// Site settings and content: shapes, defaults and validation.
// One source of truth for the backend (validates saves, serves /api/site) and the
// frontend (renders the storefront, generates admin forms). Pure ESM, no dependencies.
//
// Title fields accept light markup: ~outline~, ==highlight==, ^accent^.

// ---------------------------------------------------------------------------
// Field builders
// ---------------------------------------------------------------------------
const text = (label, max = 120, opts = {}) => ({ type: "text", label, max, required: true, ...opts });
const optText = (label, max = 120, opts = {}) => ({ type: "text", label, max, required: false, ...opts });
const area = (label, max = 600, opts = {}) => ({ type: "textarea", label, max, required: true, ...opts });
const url = (label, opts = {}) => ({ type: "url", label, max: 600, required: true, ...opts });
const link = (label, opts = {}) => ({ type: "link", label, max: 300, required: true, ...opts });
const bool = (label, opts = {}) => ({ type: "bool", label, ...opts });
const num = (label, min, max, opts = {}) => ({ type: "number", label, min, max, ...opts });
const color = (label) => ({ type: "color", label });
const image = (label, opts = {}) => ({ type: "image", label, required: false, ...opts });
const icon = (label) => ({ type: "icon", label });
const list = (label, of, { min = 0, max = 12 } = {}) => ({ type: "list", label, of, minItems: min, maxItems: max });
const strings = (label, itemLabel, opts) => list(label, { value: text(itemLabel, 80) }, opts);
const obj = (label, fields) => ({ type: "object", label, fields });
const title = (label, max = 120) => text(label, max, { markup: true, help: "~outline~, ==highlight==, ^accent^" });
const visible = () => bool("Show this section");
const head = (label, { lead = true, kicker = true } = {}) =>
  obj(label, {
    ...(kicker ? { kicker: optText("Small heading", 60) } : {}),
    lines: list("Heading lines", { value: title("Line", 40) }, { min: 1, max: 3 }),
    ...(lead ? { lead: { ...area("Intro", 300), required: false } } : {}),
  });

export const ICONS = ["wrench", "shield", "truck", "package", "lock", "clock", "pin", "phone", "chat"];
export const PLACEHOLDERS = ["name", "code", "link", "orderId", "shopName", "trackingNumber", "courier", "amount"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const email = (label, placeholders) => obj(label, { subject: text("Subject", 150), body: { ...area("Body", 4000), placeholders } });

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------
export const GROUPS = {
  shop: {
    label: "Shop details",
    fields: {
      name: text("Shop name", 60),
      phone: text("Phone", 30),
      whatsapp: url("WhatsApp link"),
      facebook: url("Facebook link"),
      instagram: url("Instagram link"),
      address: area("Address", 200),
      addressShort: text("Short address", 60),
      maps: url("Google Maps link"),
      mapEmbed: url("Map embed URL", { help: "Google Maps → Share → Embed a map → the src link" }),
      coordinates: optText("Coordinates line", 60),
      locationKicker: text("Location line", 60),
      foundedYear: num("Founded year", 1900, 2100),
      tagline: area("Footer blurb", 300),
    },
  },
  hours: {
    label: "Opening hours",
    fields: {
      days: { type: "hours", label: "Weekly hours" },
      display: list("Hours as shown on the site", { day: text("Days", 30), time: text("Times", 40) }, { min: 1, max: 7 }),
      closedLabel: text("Badge on a regular closed day", 60),
      closures: { type: "dates", label: "Closed dates", maxItems: 60 },
    },
  },
  seo: {
    label: "SEO",
    fields: {
      defaultTitle: text("Default page title", 80),
      metaDescription: area("Meta description", 300),
      titles: list("Page titles", { path: link("Page path"), title: text("Title", 80) }, { max: 30 }),
    },
  },
  chatbot: {
    label: "Chatbot",
    fields: {
      url: url("Chatbot URL"),
      floating: bool("Show the floating chat button"),
      launcherLabel: text("Button label", 40),
      head: head("Chat page heading"),
      statusLine: optText("Status line", 60),
    },
  },
  theme: {
    label: "Theme",
    fields: {
      dark: obj("Dark mode", { accent: color("Accent"), accentInk: color("Text on accent"), hot: color("Hot (sale, alerts)") }),
      light: obj("Light mode", { accent: color("Accent"), accentInk: color("Text on accent"), hot: color("Hot (sale, alerts)") }),
    },
  },
  emails: {
    label: "Emails",
    fields: {
      passwordReset: email("Password reset", ["name", "code", "shopName"]),
      orderShipped: email("Order shipped", ["name", "orderId", "shopName", "trackingNumber", "courier"]),
      orderCancelled: email("Order cancelled", ["name", "orderId", "shopName", "amount"]),
      orderRefunded: email("Order refunded", ["name", "orderId", "shopName", "amount"]),
    },
  },
  "content.header": {
    label: "Header",
    fields: { links: list("Menu links", { to: link("Link"), label: text("Label", 30) }, { min: 1, max: 6 }) },
  },
  "content.home.hero": {
    label: "Hero",
    fields: {
      visible: visible(),
      lines: list("Headline lines", { value: title("Line", 40) }, { min: 1, max: 3 }),
      lead: area("Intro", 300),
      primaryCta: obj("Main button", { label: text("Label", 40), link: link("Link") }),
      secondaryCta: obj("Second button", { label: text("Label", 40), link: link("Link") }),
      showStats: bool("Show product, brand and year stats"),
      showCoordinates: bool("Show coordinates"),
    },
  },
  "content.home.brands": {
    label: "Brand wall",
    fields: { visible: visible(), showMarquee: bool("Show the scrolling brand strip"), kicker: optText("Small heading", 60), title: title("Heading"), ctaLabel: text("Button label", 40) },
  },
  "content.home.fresh": {
    label: "Fresh in",
    fields: { visible: visible(), kicker: optText("Small heading", 60), title: title("Heading"), ctaLabel: text("Button label", 40), count: num("Products shown", 2, 16) },
  },
  "content.home.categories": {
    label: "Categories",
    fields: { visible: visible(), kicker: optText("Small heading", 60), title: title("Heading"), count: num("Categories shown", 2, 12) },
  },
  "content.home.promise": {
    label: "Promise strip",
    fields: { visible: visible(), items: list("Promises", { icon: icon("Icon"), title: text("Title", 50), text: area("Text", 200) }, { min: 1, max: 4 }) },
  },
  "content.home.numbers": {
    label: "Numbers",
    fields: { visible: visible(), productsLabel: text("Products label", 50), brandsLabel: text("Brands label", 50), yearsLabel: text("Years label", 50), yearsSuffix: optText("Years suffix", 10) },
  },
  "content.home.visit": {
    label: "Visit us",
    fields: { visible: visible(), kicker: optText("Small heading", 60), title: title("Heading"), lead: area("Intro", 300), showMap: bool("Show the map") },
  },
  "content.about": {
    label: "About page",
    fields: {
      head: head("Page heading"),
      story: obj("Story", {
        visible: visible(),
        photo: image("Photo (empty uses the first banner)"),
        kicker: optText("Small heading", 60),
        title: title("Heading", 160),
        lead: area("Intro", 400),
        paragraphs: list("Paragraphs", { value: area("Paragraph", 800) }, { max: 6 }),
      }),
      marquee: obj("Brand strip", { visible: visible(), items: strings("Brands", "Brand", { max: 20 }) }),
      contact: obj("Contact cards", {
        visible: visible(),
        findTitle: text("Find us title", 40),
        callTitle: text("Call title", 40),
        callSub: text("Call note", 80),
        hoursMain: text("Hours line", 80),
        hoursSub: text("Hours note", 120),
      }),
      follow: obj("Follow us", { visible: visible(), kicker: optText("Small heading", 60), title: title("Heading"), lead: area("Intro", 300) }),
    },
  },
  "content.footer": {
    label: "Footer",
    fields: { bigText: text("Big link text", 40), bigLink: link("Big link"), copyright: text("Sign-off", 80) },
  },
  "content.notFound": {
    label: "404 page",
    fields: { kicker: optText("Small heading", 60), title: title("Heading"), ctaLabel: text("Button label", 40), ctaLink: link("Button link") },
  },
  "content.auth": {
    label: "Sign-in pages",
    fields: {
      login: head("Sign in", { lead: false }),
      signup: head("Create account", { lead: false }),
      reset: head("Reset password", { lead: false }),
      photo: image("Photo (empty uses the first banner)"),
    },
  },
  "content.pages": {
    label: "Page headings",
    fields: {
      catalog: head("Shop"),
      cart: head("Cart", { lead: false, kicker: false }),
      checkout: head("Checkout", { lead: false }),
      orders: head("My orders", { lead: false, kicker: false }),
    },
  },
};

export const GROUP_KEYS = Object.keys(GROUPS);

// ---------------------------------------------------------------------------
// Defaults: exactly what the site showed before content became editable.
// ---------------------------------------------------------------------------
const lines = (...l) => l.map((value) => ({ value }));
const day = (open, close) => ({ closed: false, open, close });
const shut = () => ({ closed: true, open: "", close: "" });

export const DEFAULTS = {
  shop: {
    name: "Faction Bikeworks",
    phone: "+6011-3332 1767",
    whatsapp: "https://wa.me/601133321767",
    facebook: "https://www.facebook.com/faction.my/",
    instagram: "https://www.instagram.com/faction.my/",
    address: "G-8, Wisma WIM, Jln Abang Haji Openg, Taman Tun Dr Ismail, 60000 Kuala Lumpur",
    addressShort: "Wisma WIM, TTDI",
    maps: "https://maps.google.com/?q=Faction+Bikeworks+Wisma+WIM",
    mapEmbed:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3983.815222182998!2d101.62756258489375!3d3.1434261450361616!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31cc495f03e40a99%3A0x50f6e08edd4ee8b8!2sFaction%20Bikeworks!5e0!3m2!1sen!2smy!4v1728336895257!5m2!1sen!2smy",
    coordinates: "3.1434° N, 101.6276° E",
    locationKicker: "Bukit Kiara, Kuala Lumpur",
    foundedYear: 2022,
    tagline: "Best-in-class MTB components since 2022. Drop by the shop at the foot of Bukit Kiara for advice, a test ride or a post-ride drink.",
  },
  hours: {
    days: [shut(), day("11:00", "19:30"), day("11:00", "19:30"), day("11:00", "19:30"), day("11:00", "19:30"), day("11:00", "19:30"), day("11:00", "16:00")],
    display: [
      { day: "Mon to Fri", time: "11:00am to 7:30pm" },
      { day: "Saturday", time: "11:00am to 4:00pm" },
      { day: "Sun & PH", time: "Closed, gone riding" },
    ],
    closedLabel: "Closed today, gone riding",
    closures: [],
  },
  seo: {
    defaultTitle: "Faction Bikeworks · MTB parts, Bukit Kiara",
    metaDescription:
      "Faction Bikeworks: best-in-class MTB components from Deity, Industry Nine, Michelin, OneUp, CushCore and more. Shop online or visit us at the foot of Bukit Kiara, KL.",
    titles: [
      { path: "/", title: "Faction Bikeworks · MTB parts, Bukit Kiara" },
      { path: "/catalog", title: "Shop · Faction Bikeworks" },
      { path: "/about", title: "About · Faction Bikeworks" },
      { path: "/cart", title: "Cart · Faction Bikeworks" },
      { path: "/checkoutPage", title: "Checkout · Faction Bikeworks" },
      { path: "/login", title: "Sign in · Faction Bikeworks" },
      { path: "/signup", title: "Create account · Faction Bikeworks" },
      { path: "/orderHistory", title: "My orders · Faction Bikeworks" },
      { path: "/chatbot", title: "Ask the mechanic · Faction Bikeworks" },
      { path: "/admin", title: "Admin · Faction Bikeworks" },
    ],
  },
  chatbot: {
    url: "https://cdn.botpress.cloud/webchat/v2.2/shareable.html?configUrl=https://files.bpcontent.cloud/2025/02/02/18/20250202183140-YKDEBF3S.json",
    floating: true,
    launcherLabel: "Ask the mechanic",
    head: { kicker: "AI mechanic", lines: lines("Ask the", "~mechanic~"), lead: "Sizing, compatibility, set-up, what to upgrade first. Ask anything bike-related, any time." },
    statusLine: "faction-mechanic · online",
  },
  theme: {
    dark: { accent: "#c6ff3d", accentInk: "#0b0c0a", hot: "#ff5a2b" },
    light: { accent: "#c6ff3d", accentInk: "#0b0c0a", hot: "#e2441a" },
  },
  emails: {
    passwordReset: {
      subject: "Password Reset Request",
      body: "Hello,\n\nYou requested a password reset. Use this code:\n\n{{code}}\n\nIt expires in 15 minutes.\n\nIf you did not request this, ignore this email.\n\n{{shopName}} Team\n",
    },
    orderShipped: {
      subject: "Your order #{{orderId}} is on its way",
      body: "Hi {{name}},\n\nGood news: order #{{orderId}} has shipped.\n\nCourier: {{courier}}\nTracking number: {{trackingNumber}}\n\nThanks for riding with us.\n{{shopName}}\n",
    },
    orderCancelled: {
      subject: "Order #{{orderId}} has been cancelled",
      body: "Hi {{name}},\n\nOrder #{{orderId}} has been cancelled. Refunded: {{amount}}.\n\nRefunds usually reach your card within 5 to 10 working days. Questions? Just reply to this email.\n\n{{shopName}}\n",
    },
    orderRefunded: {
      subject: "Refund for order #{{orderId}}",
      body: "Hi {{name}},\n\nWe've refunded {{amount}} for order #{{orderId}}. It usually reaches your card within 5 to 10 working days.\n\n{{shopName}}\n",
    },
  },
  "content.header": {
    links: [
      { to: "/catalog", label: "Shop" },
      { to: "/about", label: "About" },
      { to: "/chatbot", label: "Ask the mechanic" },
    ],
  },
  "content.home.hero": {
    visible: true,
    lines: lines("Built for", "~Kiara~ dirt^.^"),
    lead: "Deity, Industry Nine, Michelin, OneUp, CushCore, Peaty's and Trek. Best-in-class MTB parts, picked and wrenched by riders at the foot of Bukit Kiara.",
    primaryCta: { label: "Shop the parts", link: "/catalog" },
    secondaryCta: { label: "Visit the shop", link: "/#visit" },
    showStats: true,
    showCoordinates: true,
  },
  "content.home.brands": { visible: true, showMarquee: true, kicker: "Shop by brand", title: "The good ~stuff.~", ctaLabel: "All brands" },
  "content.home.fresh": { visible: true, kicker: "In stock now", title: "Fresh off the truck", ctaLabel: "Shop everything", count: 8 },
  "content.home.categories": { visible: true, kicker: "Shop by part", title: "What needs upgrading?", count: 6 },
  "content.home.promise": {
    visible: true,
    items: [
      { icon: "wrench", title: "Rider-run workshop", text: "Every part is something we ride, fit and stand behind." },
      { icon: "shield", title: "Secure checkout", text: "Card payments handled end to end by Stripe." },
      { icon: "truck", title: "Ships across Malaysia", text: "Or pick up at the shop and grab a post-ride drink." },
    ],
  },
  "content.home.numbers": { visible: true, productsLabel: "Products on the shelf", brandsLabel: "Brands we distribute", yearsLabel: "Keeping Kiara rolling", yearsSuffix: "yrs" },
  "content.home.visit": {
    visible: true,
    kicker: "Come say hi",
    title: "Foot of ==Bukit Kiara==",
    lead: "Questions answered in person, test rides arranged, and a cold drink after your loop. Special orders welcome.",
    showMap: true,
  },
  "content.about": {
    head: { kicker: "Since 2022", lines: lines("Hello", "~there.~"), lead: "We're stoked you made it to our web store: easy access to all the great MTB brands we distribute and stock." },
    story: {
      visible: true,
      photo: "",
      kicker: "The mission",
      title: "Best-in-class ==MTB parts==, from riders.",
      lead: "Since 2022, Faction's mission has been to deliver best-in-class MTB products to our customers. That has stayed true to this day.",
      paragraphs: lines(
        "Better still, drop by our physical shop at the foothills of Bukit Kiara to get your questions answered in person, grab a post-ride drink, or arrange a test ride.",
        "Interested in something from our brands that isn't listed here? Message us about special orders. Happy trails."
      ),
    },
    marquee: { visible: true, items: lines("Deity Components", "Trek Bikes", "Industry Nine", "Michelin", "OneUp Components", "CushCore", "Peaty's") },
    contact: {
      visible: true,
      findTitle: "Find us",
      callTitle: "Call or WhatsApp",
      callSub: "Fastest way to reach us",
      hoursMain: "Mon to Fri 11am to 7:30pm",
      hoursSub: "Sat 11am to 4pm · Sun & PH closed, gone riding",
    },
    follow: { visible: true, kicker: "Stay in the loop", title: "Follow the faction", lead: "Facebook and Instagram are the best way to hear about new products and promotions." },
  },
  "content.footer": { bigText: "Get dialled.", bigLink: "/catalog", copyright: "Happy trails." },
  "content.notFound": { kicker: "404 / off piste", title: "Wrong ~line.~", ctaLabel: "Back to the trailhead", ctaLink: "/" },
  "content.auth": {
    login: { kicker: "Welcome back", lines: lines("Clip", "~in.~") },
    signup: { kicker: "Join the faction", lines: lines("Drop", "~in.~") },
    reset: { kicker: "Account recovery", lines: lines("Reset", "~& ride~") },
    photo: "",
  },
  "content.pages": {
    catalog: { kicker: "The shop", lines: lines("Parts", "~& kit~"), lead: "Components we ride, fit and stand behind. Filter by part, brand or budget." },
    cart: { lines: lines("Your", "~cart~") },
    checkout: { kicker: "Secure checkout", lines: lines("Almost", "~riding~") },
    orders: { lines: lines("Order", "~history~") },
  },
};

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------
const isPlain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

/** Deep merge: objects merge key by key, arrays and scalars replace. */
export function deepMerge(base, over) {
  if (!isPlain(base) || !isPlain(over)) return over === undefined ? clone(base) : clone(over);
  const out = clone(base);
  for (const [k, v] of Object.entries(over)) out[k] = k in base ? deepMerge(base[k], v) : clone(v);
  return out;
}

/** Full site object from stored groups ({ key: value }); missing groups use defaults. */
export function mergeSite(stored = {}) {
  const out = {};
  for (const key of GROUP_KEYS) out[key] = deepMerge(DEFAULTS[key], stored[key]);
  return out;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
const HEX = /^#[0-9a-f]{6}$/i;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const LINK_MESSAGE = "Link must start with / or https://";
export const MIN_CONTRAST = 4.5;

function checkField(field, value, path, errors) {
  const fail = (msg) => {
    errors[path] = msg;
    return undefined;
  };
  switch (field.type) {
    case "text":
    case "textarea":
    case "url":
    case "link": {
      const v = value === undefined || value === null ? "" : String(value);
      const s = field.type === "textarea" ? v.replace(/\r\n/g, "\n") : v.trim();
      if (!s) return field.required ? fail("Required") : "";
      if (field.max && s.length > field.max) return fail(`Keep it under ${field.max} characters`);
      if (field.type === "url" && !/^https:\/\/[^\s]+$/i.test(s)) return fail("Must be an https:// link");
      if (field.type === "link" && !/^(\/(?!\/)[^\s]*|https:\/\/[^\s]+)$/i.test(s)) return fail(LINK_MESSAGE);
      if (field.placeholders) {
        for (const m of s.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)) {
          if (!field.placeholders.includes(m[1])) return fail(`Unknown placeholder {{${m[1]}}}`);
        }
      }
      return s;
    }
    case "image": {
      const s = value ? String(value).trim() : "";
      if (s && !/^(\/images\/[\w./-]+|https:\/\/[^\s]+)$/.test(s)) return fail("Upload an image");
      return s;
    }
    case "bool":
      return value === true;
    case "number": {
      const n = Number(value);
      if (!Number.isFinite(n) || !Number.isInteger(n)) return fail("Must be a whole number");
      if (n < field.min || n > field.max) return fail(`Must be between ${field.min} and ${field.max}`);
      return n;
    }
    case "color":
      return HEX.test(String(value || "")) ? String(value).toLowerCase() : fail("Use a colour like #c6ff3d");
    case "icon":
      return ICONS.includes(value) ? value : fail("Pick an icon");
    case "object":
      return checkFields(field.fields, isPlain(value) ? value : {}, path, errors);
    case "list": {
      const arr = Array.isArray(value) ? value : [];
      if (arr.length < field.minItems) return fail(field.minItems === 1 ? "Add at least one" : `Add at least ${field.minItems}`);
      if (arr.length > field.maxItems) return fail(`No more than ${field.maxItems}`);
      return arr.map((item, i) => checkFields(field.of, isPlain(item) ? item : {}, `${path}.${i}`, errors));
    }
    case "hours": {
      const arr = Array.isArray(value) ? value : [];
      if (arr.length !== 7) return fail("Set hours for all 7 days");
      return arr.map((d, i) => {
        const p = `${path}.${i}`;
        if (d?.closed) return { closed: true, open: "", close: "" };
        if (!TIME.test(d?.open || "") || !TIME.test(d?.close || "")) {
          errors[p] = `${DAY_NAMES[i]}: use HH:MM times`;
          return d;
        }
        if (d.close <= d.open) errors[p] = `${DAY_NAMES[i]}: closing must be after opening`;
        return { closed: false, open: d.open, close: d.close };
      });
    }
    case "dates": {
      const arr = Array.isArray(value) ? value : [];
      if (arr.length > (field.maxItems || 60)) return fail(`No more than ${field.maxItems} dates`);
      return arr.map((d, i) => {
        if (!DATE.test(d?.date || "")) errors[`${path}.${i}.date`] = "Pick a date";
        const reason = String(d?.reason || "").trim();
        if (reason.length > 60) errors[`${path}.${i}.reason`] = "Keep it under 60 characters";
        return { date: d?.date || "", reason };
      });
    }
    default:
      return value;
  }
}

function checkFields(fields, value, prefix, errors) {
  const out = {};
  for (const [name, field] of Object.entries(fields)) {
    out[name] = checkField(field, value?.[name], prefix ? `${prefix}.${name}` : name, errors);
  }
  return out;
}

/** Validate one group. Unknown keys are dropped. */
export function validateGroup(key, value) {
  const group = GROUPS[key];
  if (!group) return { ok: false, errors: { _: `Unknown settings group "${key}"` } };
  const errors = {};
  const clean = checkFields(group.fields, isPlain(value) ? value : {}, "", errors);
  if (key === "theme") {
    for (const mode of ["dark", "light"]) {
      const t = clean[mode];
      if (!t || errors[`${mode}.accent`] || errors[`${mode}.accentInk`]) continue;
      const msg = contrastMessage(t.accentInk, t.accent);
      if (msg) errors[`${mode}.accentInk`] = msg;
      const bg = BACKGROUNDS[mode];
      const at = deriveAccentText(t.accent, bg);
      if (contrast(at, bg) < MIN_CONTRAST) errors[`${mode}.accent`] = contrastMessage(at, bg);
    }
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: clean };
}

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------
export const BACKGROUNDS = { dark: "#0b0c0a", light: "#f1f0ea" };

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c) => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
const lum = (hex) => {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio between two #rrggbb colours. */
export function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

export function contrastMessage(fg, bg) {
  const c = contrast(fg, bg);
  if (c >= MIN_CONTRAST) return null;
  return `Text on this colour is hard to read (${(Math.floor(c * 10) / 10).toFixed(1)}:1, needs ${MIN_CONTRAST}:1)`;
}

/** The accent used for text on the page background: the accent itself if readable, else nudged. */
export function deriveAccentText(accent, bg) {
  if (contrast(accent, bg) >= MIN_CONTRAST) return accent.toLowerCase();
  const darken = lum(bg) > 0.5;
  let c = rgb(accent);
  for (let i = 0; i < 20; i++) {
    c = c.map((v) => (darken ? v * 0.9 : v + (255 - v) * 0.1));
    if (contrast(toHex(c), bg) >= MIN_CONTRAST) return toHex(c);
  }
  return darken ? "#000000" : "#ffffff";
}

export function themeVars(theme) {
  const out = {};
  for (const mode of ["dark", "light"]) {
    const t = theme[mode];
    const [r, g, b] = rgb(t.accent);
    out[mode] = {
      "--accent": t.accent,
      "--accent-text": deriveAccentText(t.accent, BACKGROUNDS[mode]),
      "--accent-ink": t.accentInk,
      "--accent-glow": `rgba(${r}, ${g}, ${b}, ${mode === "dark" ? 0.35 : 0.3})`,
      "--hot": t.hot,
    };
  }
  return out;
}

// ---------------------------------------------------------------------------
// Hours
// ---------------------------------------------------------------------------
/** Shop open/closed right now, in Malaysia time (UTC+8). */
export function shopStatus(hours, now = new Date()) {
  const my = new Date(now.getTime() + 8 * 3600000);
  const date = my.toISOString().slice(0, 10);
  const closure = (hours?.closures || []).find((c) => c.date === date);
  if (closure) return { open: false, label: closure.reason ? `Closed today: ${closure.reason}` : "Closed today" };
  const d = hours?.days?.[my.getUTCDay()];
  if (!d || d.closed) return { open: false, label: hours?.closedLabel || "Closed today" };
  const hm = `${String(my.getUTCHours()).padStart(2, "0")}:${String(my.getUTCMinutes()).padStart(2, "0")}`;
  if (hm >= d.open && hm < d.close) return { open: true, label: "Open now" };
  return { open: false, label: "Closed now" };
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------
/** "{{name}}" placeholders; unknown ones are left as typed. */
export function renderTemplate(str, vars = {}) {
  return String(str || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (vars[k] === undefined || vars[k] === null ? "" : String(vars[k])));
}

/** Split title markup into [{text, style: "plain"|"outline"|"hl"|"accent"}]. */
export function parseMarkup(str) {
  const out = [];
  const re = /~([^~]+)~|==([^=]+)==|\^([^^]+)\^/g;
  let last = 0;
  for (const m of String(str || "").matchAll(re)) {
    if (m.index > last) out.push({ text: m[0] && str.slice(last, m.index), style: "plain" });
    out.push(m[1] ? { text: m[1], style: "outline" } : m[2] ? { text: m[2], style: "hl" } : { text: m[3], style: "accent" });
    last = m.index + m[0].length;
  }
  if (last < String(str || "").length) out.push({ text: str.slice(last), style: "plain" });
  return out;
}

/** Plain text of a markup string (for alt text, titles, search). */
export const stripMarkup = (str) => parseMarkup(str).map((p) => p.text).join("");
