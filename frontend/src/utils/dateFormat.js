/**
 * Format an ISO date string (YYYY-MM-DD) or Date object to DD/MM/YYYY.
 */
export function formatDate(dateStr) {
  if (!dateStr) return "—";
  const str = typeof dateStr === "string" ? dateStr : dateStr.toISOString();
  const parts = str.split("T")[0].split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
