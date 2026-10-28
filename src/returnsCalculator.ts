import { HistoricalBar } from './types';

export interface CalculatedReturn {
  period: string;
  gainPct: number;
  gainAmount: number;
  startPrice: number;
  endPrice: number;
  startDate: string;
  endDate: string;
  formatted: string;
  isAvailable: boolean;
}

/**
 * Shared, deterministic historical return calculator.
 * Rule: base = closing price on the last trading day on or before (today minus N calendar days),
 *       end = latest close.
 * If history is too short to reach the target calendar date, returns isAvailable: false (N/A).
 */
export function calculateHistoricalReturn(
  bars: HistoricalBar[],
  calendarDays: number,
  periodLabel: string
): CalculatedReturn {
  if (!bars || !Array.isArray(bars) || bars.length < 2) {
    return {
      period: periodLabel,
      gainPct: 0,
      gainAmount: 0,
      startPrice: 0,
      endPrice: 0,
      startDate: '',
      endDate: '',
      formatted: 'N/A',
      isAvailable: false
    };
  }

  // Ensure chronological sorting by date
  const sorted = [...bars]
    .filter(b => b && typeof b.close === 'number' && !isNaN(b.close) && b.close > 0 && b.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sorted.length < 2) {
    return {
      period: periodLabel,
      gainPct: 0,
      gainAmount: 0,
      startPrice: 0,
      endPrice: sorted[0]?.close ?? 0,
      startDate: '',
      endDate: sorted[0]?.date ?? '',
      formatted: 'N/A',
      isAvailable: false
    };
  }

  const endBar = sorted[sorted.length - 1];
  const endDate = new Date(endBar.date);
  if (isNaN(endDate.getTime())) {
    return {
      period: periodLabel,
      gainPct: 0,
      gainAmount: 0,
      startPrice: 0,
      endPrice: endBar.close,
      startDate: '',
      endDate: endBar.date,
      formatted: 'N/A',
      isAvailable: false
    };
  }

  // Calculate target calendar date: endDate minus calendarDays
  const targetTs = endDate.getTime() - calendarDays * 24 * 60 * 60 * 1000;
  const targetDateStr = new Date(targetTs).toISOString().split('T')[0];

  // Search backwards from second-to-last bar for the latest trading day ON OR BEFORE targetDateStr
  let baseBar: HistoricalBar | null = null;
  for (let i = sorted.length - 2; i >= 0; i--) {
    if (sorted[i].date <= targetDateStr) {
      baseBar = sorted[i];
      break;
    }
  }

  // If history does not extend back to or before target date, mark as unavailable
  if (!baseBar || baseBar.close <= 0 || endBar.close <= 0) {
    return {
      period: periodLabel,
      gainPct: 0,
      gainAmount: 0,
      startPrice: 0,
      endPrice: endBar.close,
      startDate: '',
      endDate: endBar.date,
      formatted: 'N/A',
      isAvailable: false
    };
  }

  const gainAmount = Math.round((endBar.close - baseBar.close) * 100) / 100;
  const gainPct = Math.round(((endBar.close - baseBar.close) / baseBar.close) * 10000) / 100;

  return {
    period: periodLabel,
    gainPct,
    gainAmount,
    startPrice: baseBar.close,
    endPrice: endBar.close,
    startDate: baseBar.date,
    endDate: endBar.date,
    formatted: `${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(2)}%`,
    isAvailable: true
  };
}

export function getStandardHistoricalReturns(bars: HistoricalBar[]) {
  return {
    week1: calculateHistoricalReturn(bars, 7, '1 Week'),
    month1: calculateHistoricalReturn(bars, 30, '1 Month'),
    month3: calculateHistoricalReturn(bars, 90, '3 Months'),
    month6: calculateHistoricalReturn(bars, 180, '6 Months'),
    year1: calculateHistoricalReturn(bars, 365, '1 Year'),
    year3: calculateHistoricalReturn(bars, 365 * 3, '3 Years'),
    year5: calculateHistoricalReturn(bars, 365 * 5, '5 Years')
  };
}
