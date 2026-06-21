export type DailyUsageItem = { date: string; peakKwh: number; offPeakKwh: number };
export type DailyUsageSummaryItem = {
  month: number;
  peakKwh: number;
  offPeakKwh: number;
  totalKwh: number;
  billAmount: number | null;
};
export type MonthSummary = { month: number; totalKwh: number; evKwh: number; nonEvKwh: number };
export type ChargingSession = { date: string; startTime: string; endTime: string; duration: string; kwh: number; cost: number };
export type MonthUsage = { month: number; evKwh: number; nonEvKwh: number };
