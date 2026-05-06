import * as XLSX from "xlsx";

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanEmail(value) {
  const text = String(value || "").trim().toLowerCase();
  return text || "";
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getCell(row, headers, names) {
  const index = headers.findIndex((header) => names.some((name) => header.includes(name)));
  return index >= 0 ? row[index] : "";
}

function rowToAllowedEmail(row, headers) {
  const employee_name = String(getCell(row, headers, ["employee name", "name"])).trim();
  const outlook_email = cleanEmail(getCell(row, headers, ["outlook email", "mepstra email", "company email"]));
  const gmail = cleanEmail(getCell(row, headers, ["office email", "gmail", "personal email"]));
  const notes = String(getCell(row, headers, ["notes", "note"])).trim();

  if (!employee_name || (!outlook_email && !gmail)) return null;

  return {
    employee_name,
    outlook_email: outlook_email || undefined,
    gmail: gmail || undefined,
    notes: notes || undefined,
    casual_leaves: toNumber(getCell(row, headers, ["casual leaves", "casual", "cl"]), 12),
    sick_leaves: toNumber(getCell(row, headers, ["sick leaves", "sick", "sl"]), 6),
    optional_leaves: toNumber(getCell(row, headers, ["optional leaves", "optional", "ol"]), 2),
  };
}

function dedupeRows(rows) {
  const byKey = new Map();
  rows.forEach((row) => {
    const key = row.outlook_email || row.gmail || row.employee_name.toLowerCase();
    byKey.set(key, row);
  });
  return [...byKey.values()];
}

export async function parseAllowedEmailsFile(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!["xls", "xlsx"].includes(extension)) {
    throw new Error("Upload the Excel template file only.");
  }

  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "", raw: false });
  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => /employee|name/i.test(String(cell))) &&
    row.some((cell) => /email/i.test(String(cell)))
  );

  const headers = (headerIndex >= 0 ? rows[headerIndex] : rows[0] || []).map(normalizeHeader);
  const dataRows = rows.slice(headerIndex >= 0 ? headerIndex + 1 : 1);
  return dedupeRows(dataRows.map((row) => rowToAllowedEmail(row, headers)).filter(Boolean));
}

export function downloadAllowedEmailsTemplate() {
  const rows = [
    ["Employee Name", "Outlook Email", "Office Email", "Casual Leaves", "Sick Leaves", "Optional Leaves", "Notes"],
    ["John Doe", "john.doe@mepstra.com", "john.doe@gmail.com", 12, 6, 2, ""],
    ["Priya Sharma", "priya.sharma@mepstra.com", "", 12, 6, 2, "Only Outlook email"],
    ["Rahul Reddy", "", "rahul.reddy@gmail.com", 10, 5, 2, "Mid-year joining"],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 24 },
    { wch: 30 },
    { wch: 30 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 28 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Whitelist Template");
  XLSX.writeFile(workbook, "employee-whitelist-template.xlsx");
}
