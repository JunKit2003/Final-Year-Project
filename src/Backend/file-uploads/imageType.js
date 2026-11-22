// Identify an image by its first bytes, not its name or the browser's claim.
export function sniffImage(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TOO_BIG = "Photos must be 5 MB or smaller";
export const IMAGE_BAD_TYPE = "Only JPG, PNG or WebP photos";
