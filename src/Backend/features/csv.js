// Small RFC 4180 CSV reader/writer (no dependency). Handles a UTF-8 BOM, CRLF,
// quoted fields with commas, newlines and doubled quotes, and trailing blank lines.
export function parseCsv(text) {
  const s = String(text ?? "").replace(/^﻿/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  while (rows.length && rows[rows.length - 1].every((f) => f.trim() === "")) rows.pop();
  return rows.filter((r, i) => i === 0 || !r.every((f) => f.trim() === ""));
}

const cell = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  // Leading = + - @ would run as a formula in Excel; prefix a quote to keep it text.
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const toCsv = (rows) => `﻿${rows.map((r) => r.map(cell).join(",")).join("\r\n")}\r\n`;

export function sendCsv(res, filename, rows) {
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(toCsv(rows));
}
