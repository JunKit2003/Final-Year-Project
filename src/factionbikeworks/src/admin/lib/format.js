import { formatRM } from "../../lib/shop";

export { formatRM };
const dt = new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" });
const d = new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeZone: "Asia/Kuala_Lumpur" });
export const formatDateTime = (v) => (v ? dt.format(new Date(v)) : "");
export const formatDate = (v) => (v ? d.format(new Date(v)) : "");
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const signed = (n) => (n > 0 ? `+${n}` : String(n));
