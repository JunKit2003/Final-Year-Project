import axios from "axios";

// Same origin by default: nginx (prod) or the Vite dev proxy forwards /api and /images.
// Set VITE_API_URL only when the API lives on another origin.
export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

// Backend image paths come back either relative ("/images/...") or absolute.
export const assetUrl = (path) => {
  if (!path) return null;
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:") || path.startsWith("blob:")) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
};

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

export default api;
