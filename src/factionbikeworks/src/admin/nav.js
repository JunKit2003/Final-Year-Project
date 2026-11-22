// Admin navigation, in the order the design lists it.
export const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/stock", label: "Stock" },
  { to: "/admin/taxonomy", label: "Categories & brands" },
  { to: "/admin/banners", label: "Banners" },
  { to: "/admin/content/home", label: "Site content", match: "/admin/content" },
  { to: "/admin/settings/shop", label: "Shop settings", match: "/admin/settings" },
  { to: "/admin/customers", label: "Customers" },
  { to: "/admin/activity", label: "Activity" },
];

export const CONTENT_PAGES = [
  { key: "home", label: "Home" },
  { key: "about", label: "About" },
  { key: "layout", label: "Header & footer" },
  { key: "pages", label: "Page headings" },
  { key: "not-found", label: "404" },
  { key: "auth", label: "Sign-in pages" },
];

export const SETTINGS_PAGES = [
  { key: "shop", label: "Shop details" },
  { key: "hours", label: "Hours" },
  { key: "chatbot", label: "Chatbot" },
  { key: "seo", label: "SEO" },
  { key: "theme", label: "Theme" },
  { key: "emails", label: "Emails" },
];
