export function monthLabel(month: number): string {
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1] ?? String(month);
}
export function formatKwh(value: number): string {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}
export function formatMoney(value: number): string {
  const n = value.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `RM ${n}`;
}
export function parseCsvDate(dateStr: string): string {
  const months: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  const cleaned = dateStr.trim().replace(/\s+/g, " ");
  const parts = cleaned.split(" ");
  if (parts.length < 3) return "";
  const mon = parts[0].toLowerCase().slice(0, 3);
  const day = parts[1].replace(",", "").padStart(2, "0");
  const year = parts[2];
  const mm = months[mon];
  if (!mm) return "";
  return `${year}-${mm}-${day}`;
}
export function formatDisplayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}
export function getDay(dateStr: string): number {
  return Number.parseInt(dateStr.slice(8, 10), 10);
}
export function emptyYearData(): { month: number; evKwh: number; nonEvKwh: number }[] {
  return Array.from({ length: 12 }, (_, idx) => ({ month: idx + 1, evKwh: 0, nonEvKwh: 0 }));
}
