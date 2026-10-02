// Quotes what needs quoting. Names and free text come from user-editable
// Clerk profiles and forms, so cells that a spreadsheet would run as a
// formula get a leading apostrophe.
export const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  let text =
    value instanceof Date
      ? value.toISOString()
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// A whole CSV file: the header row, then one line per row. The BOM makes
// Excel read the file as UTF-8.
export const toCsv = (
  columns: readonly string[],
  rows: readonly Record<string, unknown>[],
): string => {
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ];
  return `﻿${lines.join("\r\n")}\r\n`;
};
