import React, { useState, useEffect, useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Clock, Activity, AlertCircle, RefreshCw, BarChart2 } from 'lucide-react';
import { HistoricalBar, StockQuote, TechnicalIndicators, MarketIndexItem } from '../types';
import { getStandardHistoricalReturns, formatQuoteTimeIst } from '../returnsCalculator';
import { computeIndicators } from '../dataEngine';

interface IndexDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  name: string;
  region: 'India' | 'US';
  indexItem?: MarketIndexItem | null;
}

export const IndexDetailModal: React.FC<IndexDetailModalProps> = ({
  isOpen,
  onClose,
  symbol,
  name,
  region,
  indexItem
}) => {
  const [selectedRange, setSelectedRange] = useState<'1m' | '3m' | '6m' | '1y'>('3m');
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [bars, setBars] = useState<HistoricalBar[]>([]);
  const [technicals, setTechnicals] = useState<TechnicalIndicators>({});
  const [lastUpdatedIst, setLastUpdatedIst] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !symbol) return;

    let isMounted = true;
    async function fetchIndexData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/stock/${encodeURIComponent(symbol)}?range=1y`);
        if (!res.ok) {
          throw new Error(`Failed to load index data for ${name} (${symbol})`);
        }
        const data = await res.json();
        if (isMounted) {
          const rawBars: HistoricalBar[] = data.bars || [];
          // Enrich bars with technical indicators
          const enrichedBars = computeIndicators(rawBars);
          setBars(enrichedBars);
          setQuote(data.quote || null);
          setTechnicals(data.technicals || {});

          // Format last updated time in IST
          const istTime = new Date().toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }) + ' IST';
          setLastUpdatedIst(istTime);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Unable to retrieve index data.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchIndexData();
    return () => { isMounted = false; };
  }, [isOpen, symbol, indexItem?.timestamp]);

  // Handle escape key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Standard historical returns using the unified calculator
  const standardReturns = useMemo(() => {
    return getStandardHistoricalReturns(bars);
  }, [bars]);

  // Filter bars for the chart based on timeframe
  const displayBars = useMemo(() => {
    if (bars.length === 0) return [];
    const countMap: Record<string, number> = {
      '1m': 22,
      '3m': 66,
      '6m': 130,
      '1y': 252
    };
    const maxCount = countMap[selectedRange] || 66;
    return bars.slice(-maxCount);
  }, [bars, selectedRange]);

  if (!isOpen) return null;

  // Use the shared index quote values from the card to ensure 100% agreement between card and modal
  const price = indexItem ? indexItem.price : (quote?.price ?? (bars.length > 0 ? bars[bars.length - 1].close : null));
  const change = indexItem ? indexItem.change : (quote?.change ?? (bars.length >= 2 ? bars[bars.length - 1].close - bars[bars.length - 2].close : 0));
  const changePct = indexItem ? indexItem.changePct : (quote?.changePct ?? (bars.length >= 2 && bars[bars.length - 2].close > 0 ? ((change / bars[bars.length - 2].close) * 100) : 0));
  const isPos = change >= 0;
  const currSym = region === 'US' ? '$' : '₹';
  const quoteTimeIst = formatQuoteTimeIst(indexItem?.timestamp || lastUpdatedIst || new Date());

  // Day high/low
  const latestBar = bars.length > 0 ? bars[bars.length - 1] : null;
  const dayHigh = latestBar?.high && latestBar.high > 0 ? latestBar.high : null;
  const dayLow = latestBar?.low && latestBar.low > 0 ? latestBar.low : null;

  // 52-week range computed from the last 252 daily bars (or all bars if fewer)
  const barsFor52w = useMemo(() => {
    return bars.slice(-252).filter(b => typeof b.low === 'number' && typeof b.high === 'number' && b.low > 0 && b.high > 0);
  }, [bars]);

  const sessions52wCount = barsFor52w.length;
  const has52w = sessions52wCount >= 150;

  const low52 = useMemo(() => {
    if (!has52w) return null;
    let min = Infinity;
    for (const b of barsFor52w) {
      if (b.low < min) min = b.low;
    }
    return min === Infinity ? null : min;
  }, [barsFor52w, has52w]);

  const high52 = useMemo(() => {
    if (!has52w) return null;
    let max = -Infinity;
    for (const b of barsFor52w) {
      if (b.high > max) max = b.high;
    }
    return max === -Infinity ? null : max;
  }, [barsFor52w, has52w]);

  const caption52w = has52w
    ? `High/low over ${sessions52wCount} sessions`
    : `High/low over ${sessions52wCount} sessions (minimum 150 required)`;

  // Technical values (never fabricated)
  const currentRsi = technicals.rsi !== undefined ? technicals.rsi : latestBar?.rsi;
  const currentEma20 = technicals.ema20 !== undefined ? technicals.ema20 : latestBar?.ema20;
  const currentEma50 = technicals.ema50 !== undefined ? technicals.ema50 : latestBar?.ema50;

  // SVG Chart bounds
  const chartWidth = 720;
  const chartHeight = 220;
  const padLeft = 10;
  const padRight = 60;
  const padTop = 15;
  const padBottom = 25;
  const innerW = chartWidth - padLeft - padRight;
  const innerH = chartHeight - padTop - padBottom;

  let minP = Infinity;
  let maxP = -Infinity;
  for (const b of displayBars) {
    if (b.low < minP) minP = b.low;
    if (b.high > maxP) maxP = b.high;
  }
  if (minP === Infinity || maxP === -Infinity) {
    minP = 100;
    maxP = 110;
  }
  const pMargin = (maxP - minP) * 0.05 || 1;
  const yMin = minP - pMargin;
  const yMax = maxP + pMargin;

  const getY = (val: number) => {
    return padTop + (1 - (val - yMin) / (yMax - yMin)) * innerH;
  };
  const getX = (i: number) => {
    return padLeft + (i / Math.max(1, displayBars.length - 1)) * innerW;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${name} Index Details`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[92vh] font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {region} Benchmark Index
              </span>
              <span className="text-xs font-mono text-slate-400">
                Ticker: {symbol}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-mono text-slate-100">
              {name}
            </h2>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Quote: {quoteTimeIst}
              </span>
              <span>·</span>
              <span className="text-slate-400">Source: Yahoo Finance Live Index Feed</span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close index details"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading / Error / Content */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3 font-mono text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
            <span>Fetching live benchmark candlestick observations...</span>
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-950/40 border border-rose-800/80 rounded-xl space-y-2 font-mono text-xs text-rose-300">
            <div className="flex items-center gap-2 font-bold text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>Failed to load index data</span>
            </div>
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* Price & Level Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 font-mono">
              <div>
                <span className="text-[11px] text-slate-500 block uppercase">Current Index Level</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-100 mt-0.5">
                  {price !== null ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold mt-1 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPos ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  <span>{isPos ? '+' : ''}{change.toFixed(2)} ({isPos ? '+' : ''}{changePct.toFixed(2)}%)</span>
                  <span className="text-slate-500 font-normal ml-1">Today · {quoteTimeIst}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block uppercase">Session Range</span>
                <div className="text-sm font-bold text-slate-200 mt-1">
                  {dayHigh !== null && dayLow !== null
                    ? `${dayLow.toLocaleString(undefined, { maximumFractionDigits: 2 })} – ${dayHigh.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                    : 'Last close shown (Session closed)'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  High: {dayHigh !== null ? dayHigh.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'N/A'} · Low: {dayLow !== null ? dayLow.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'N/A'}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block uppercase">52-Week Range</span>
                <div className="text-sm font-bold text-slate-200 mt-1">
                  {high52 !== null && low52 !== null
                    ? `${low52.toLocaleString(undefined, { maximumFractionDigits: 2 })} – ${high52.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                    : 'N/A'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {caption52w}
                </div>
              </div>
            </div>

            {/* Standard Historical Returns (Shared Invariant) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Verified Historical Returns
                </span>
                <span className="text-[10px] text-slate-500">
                  Shared return invariant (exact base date)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                {[
                  { label: '1 Week', ret: standardReturns.week1 },
                  { label: '1 Month', ret: standardReturns.month1 },
                  { label: '3 Months', ret: standardReturns.month3 },
                  { label: '1 Year', ret: standardReturns.year1 }
                ].map(({ label, ret }) => (
                  <div key={label} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">{label}</span>
                    <div className={`text-base font-bold mt-0.5 ${!ret.isAvailable ? 'text-slate-400' : ret.gainPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {ret.isAvailable ? ret.formatted : 'N/A'}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {ret.isAvailable ? `Base: ${ret.startDate}` : 'Insufficient history'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Indicators Strip */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950/40 border border-slate-800 rounded-xl font-mono text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block">EMA (20)</span>
                <span className="font-bold text-slate-200">
                  {currentEma20 !== undefined ? currentEma20.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">EMA (50)</span>
                <span className="font-bold text-slate-200">
                  {currentEma50 !== undefined ? currentEma50.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">RSI (14)</span>
                <span className={`font-bold ${currentRsi !== undefined ? (currentRsi > 70 ? 'text-rose-400' : currentRsi < 30 ? 'text-emerald-400' : 'text-slate-200') : 'text-slate-400'}`}>
                  {currentRsi !== undefined ? currentRsi.toFixed(1) : 'N/A'}
                </span>
              </div>
            </div>

            {/* Chart Timeframe & Mode Controls */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <BarChart2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                    Price Action Chart
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Chart Style Toggle */}
                  <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs font-mono">
                    <button
                      onClick={() => setChartType('candlestick')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                        chartType === 'candlestick' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Candles
                    </button>
                    <button
                      onClick={() => setChartType('line')}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                        chartType === 'line' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Line
                    </button>
                  </div>

                  {/* Range Selector */}
                  <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs font-mono">
                    {(['1m', '3m', '6m', '1y'] as const).map(r => (
                      <button
                        key={r}
                        onClick={() => setSelectedRange(r)}
                        className={`px-2 py-1 rounded text-[11px] font-semibold uppercase transition-colors ${
                          selectedRange === r ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Responsive SVG Chart */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 overflow-hidden">
                {displayBars.length > 0 ? (
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-48 sm:h-56 select-none"
                  >
                    {/* Gridlines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                      const y = padTop + pct * innerH;
                      const val = yMax - pct * (yMax - yMin);
                      return (
                        <g key={idx}>
                          <line
                            x1={padLeft}
                            y1={y}
                            x2={chartWidth - padRight}
                            y2={y}
                            stroke="#1e293b"
                            strokeWidth="1"
                            strokeDasharray="2 3"
                          />
                          <text
                            x={chartWidth - padRight + 6}
                            y={y + 3}
                            fill="#64748b"
                            fontSize="9"
                            fontFamily="monospace"
                          >
                            {val.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                          </text>
                        </g>
                      );
                    })}

                    {/* Candlesticks or Line */}
                    {chartType === 'candlestick' ? (
                      displayBars.map((b, i) => {
                        const x = getX(i);
                        const cWidth = Math.max(2, Math.min(6, (innerW / displayBars.length) * 0.7));
                        const isBull = b.close >= b.open;
                        const cColor = isBull ? '#10b981' : '#f43f5e';
                        const yOpen = getY(b.open);
                        const yClose = getY(b.close);
                        const yH = getY(b.high);
                        const yL = getY(b.low);
                        const top = Math.min(yOpen, yClose);
                        const h = Math.max(1, Math.abs(yClose - yOpen));

                        return (
                          <g key={i}>
                            <line x1={x} y1={yH} x2={x} y2={yL} stroke={cColor} strokeWidth="1" />
                            <rect
                              x={x - cWidth / 2}
                              y={top}
                              width={cWidth}
                              height={h}
                              fill={cColor}
                            />
                          </g>
                        );
                      })
                    ) : (
                      <path
                        d={displayBars.reduce((acc, b, i) => {
                          const x = getX(i);
                          const y = getY(b.close);
                          return `${acc} ${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }, '')}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2"
                      />
                    )}

                    {/* EMA 20 overlay */}
                    {displayBars.some(b => typeof b.ema20 === 'number') && (
                      <path
                        d={displayBars.reduce((acc, b, i) => {
                          if (typeof b.ema20 !== 'number') return acc;
                          const x = getX(i);
                          const y = getY(b.ema20);
                          return `${acc} ${acc ? 'L' : 'M'} ${x} ${y}`;
                        }, '')}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.2"
                        opacity="0.8"
                      />
                    )}

                    {/* EMA 50 overlay */}
                    {displayBars.some(b => typeof b.ema50 === 'number') && (
                      <path
                        d={displayBars.reduce((acc, b, i) => {
                          if (typeof b.ema50 !== 'number') return acc;
                          const x = getX(i);
                          const y = getY(b.ema50);
                          return `${acc} ${acc ? 'L' : 'M'} ${x} ${y}`;
                        }, '')}
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth="1.2"
                        opacity="0.8"
                      />
                    )}
                  </svg>
                ) : (
                  <div className="py-12 text-center text-xs font-mono text-slate-500">
                    No historical chart observations available for this timeframe.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3">
          <span className="text-[11px] font-mono text-slate-500">
            Educational Market Analysis · No Financial Advice
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
