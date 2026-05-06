import * as XLSX from "xlsx";

const MONTHS = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function pad(value) {
  return String(value).padStart(2, "0");
}

function toDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function inferYearFromText(text, fallbackYear) {
  const match = String(text || "").match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : fallbackYear;
}

function parseDateValue(value, fallbackYear) {
  if (!value && value !== 0) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toDateString(value);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`;
  }

  const raw = String(value).trim().replace(/\s+/g, " ");
  if (!raw) return "";

  const iso = raw.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) return `${iso[1]}-${pad(iso[2])}-${pad(iso[3])}`;

  const numeric = raw.match(/\b(\d{1,2})[-/](\d{1,2})(?:[-/](\d{2,4}))?\b/);
  if (numeric) {
    const year = numeric[3] ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]) : fallbackYear;
    return `${year}-${pad(numeric[2])}-${pad(numeric[1])}`;
  }

  const named = raw.match(/\b(\d{1,2})[-/\s]([A-Za-z]{3,9})(?:[-/\s](20\d{2}))?\b/);
  if (named) {
    const month = MONTHS[named[2].toLowerCase()];
    if (month !== undefined) {
      const year = named[3] ? Number(named[3]) : fallbackYear;
      return `${year}-${pad(month + 1)}-${pad(named[1])}`;
    }
  }

  const parsedDate = new Date(raw);
  if (!Number.isNaN(parsedDate.getTime())) return toDateString(parsedDate);

  return "";
}

function normalizeType(value) {
  const text = String(value || "").toLowerCase();
  return text.includes("optional") ? "optional" : "mandatory";
}

function cleanName(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\bmandatory\b|\boptional\b/gi, "")
    .trim();
}

function rowToHoliday(row, headers, fallbackYear) {
  const lowerHeaders = headers.map((h) => String(h || "").toLowerCase());
  const dateIndex = lowerHeaders.findIndex((h) => h.includes("date"));
  const nameIndex = lowerHeaders.findIndex((h) => h.includes("holiday") || h.includes("name") || h.includes("occasion"));
  const typeIndex = lowerHeaders.findIndex((h) => h.includes("type"));

  const useful = row.map((cell) => cell ?? "").filter((cell) => String(cell).trim());
  const date = parseDateValue(dateIndex >= 0 ? row[dateIndex] : useful[0], fallbackYear);
  const name = cleanName(nameIndex >= 0 ? row[nameIndex] : useful[2] || useful[1]);
  const holiday_type = normalizeType(typeIndex >= 0 ? row[typeIndex] : useful[3] || row.join(" "));

  if (!date || !name || /^holiday$/i.test(name)) return null;
  return {
    name,
    date,
    holiday_type,
    description: null,
    year: Number(date.slice(0, 4)),
  };
}

function dedupeHolidays(holidays) {
  const byDate = new Map();
  holidays.forEach((holiday) => byDate.set(holiday.date, holiday));
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function parseHolidayCalendarFile(file, fallbackYear) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!["xls", "xlsx"].includes(extension)) {
    throw new Error("Upload the Excel template file only.");
  }

  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "", raw: true });
  const year = inferYearFromText(rows.flat().join(" "), fallbackYear);
  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => /date/i.test(String(cell))) &&
    row.some((cell) => /holiday|name|occasion/i.test(String(cell)))
  );
  const headers = headerIndex >= 0 ? rows[headerIndex] : ["date", "day", "holiday", "type"];
  const dataRows = rows.slice(headerIndex >= 0 ? headerIndex + 1 : 0);

  return dedupeHolidays(dataRows.map((row) => rowToHoliday(row, headers, year)).filter(Boolean));
}

export function downloadHolidayCalendarTemplate(year = new Date().getFullYear()) {
  const rows = [
    ["Date", "Day", "Holiday Name", "Type"],
    [new Date(year, 0, 1), "Thursday", "New Year Day", "Optional"],
    [new Date(year, 0, 14), "Wednesday", "Bhogi", "Mandatory"],
    [new Date(year, 0, 15), "Thursday", "Sankranti", "Mandatory"],
    [new Date(year, 0, 16), "Friday", "Day after Sankranti/Kanuma", "Optional"],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 34 }, { wch: 14 }];
  Object.keys(worksheet).forEach((cell) => {
    if (cell[0] !== "!" && cell.startsWith("A") && worksheet[cell].v instanceof Date) {
      worksheet[cell].z = "dd-mmm-yyyy";
    }
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Holiday Template");
  XLSX.writeFile(workbook, `holiday-calendar-template-${year}.xlsx`);
}
