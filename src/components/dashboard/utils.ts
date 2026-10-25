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
