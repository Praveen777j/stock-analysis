import React, { useState, useMemo, useRef } from 'react';
import { HistoricalBar, StockQuote } from '../types';
import { TrendingUp, TrendingDown, Layers, BarChart2 } from 'lucide-react';

interface ChartsPageProps {
  ticker: string;
  bars: HistoricalBar[];
  quote: StockQuote;
}

type Period = '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'Max';
type ChartType = 'Candlestick' | 'Line';

export const ChartsPage: React.FC<ChartsPageProps> = ({
  ticker,
  bars,
  quote
}) => {
  const [period, setPeriod] = useState<Period>('1Y');
  const [chartType, setChartType] = useState<ChartType>('Candlestick');
  const [showEma20, setShowEma20] = useState(true);
  const [showEma50, setShowEma50] = useState(true);
  const [showEma200, setShowEma200] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Filter bars by period
  const filteredBars = useMemo(() => {
    const periodDays: Record<Period, number> = {
      '1M': 22,
      '3M': 65,
      '6M': 130,
      '1Y': 252,
      '3Y': 756,
      '5Y': 1250,
      'Max': bars.length
    };
    const count = periodDays[period] || 252;
    return bars.slice(-count);
  }, [bars, period]);

  const currSym = quote.currency === 'USD' ? '$' : '₹';

  // Compute period gain percentage and explicit start/end observations
  const startBar = filteredBars.length > 0 ? filteredBars[0] : null;
  const endBar = filteredBars.length > 0 ? filteredBars[filteredBars.length - 1] : null;

  const periodGainPct = useMemo(() => {
    if (filteredBars.length < 2) return quote.changePct || 0;
    const startPrice = filteredBars[0].close;
    const endPrice = filteredBars[filteredBars.length - 1].close;
    if (startPrice <= 0) return 0;
    return Math.round(((endPrice - startPrice) / startPrice) * 1000) / 10;
  }, [filteredBars, quote.changePct]);

  const periodGainAmount = useMemo(() => {
    if (filteredBars.length < 2) return quote.change || 0;
    const startPrice = filteredBars[0].close;
    const endPrice = filteredBars[filteredBars.length - 1].close;
    return Math.round((endPrice - startPrice) * 100) / 100;
  }, [filteredBars, quote.change]);

  const hasEma200Data = useMemo(() => {
    return filteredBars.some(b => typeof b.ema200 === 'number' && Number.isFinite(b.ema200));
  }, [filteredBars]);

  const svgRef = useRef<SVGSVGElement>(null);

  // Layout dimensions for SVG (Matplotlib subplot grid layout)
  const width = 1000;
  const priceHeight = 310;
  const volHeight = 65;
  const rsiHeight = 75;
  const macdHeight = 75;
  const gap = 18;
  const paddingRight = 75;
  const paddingLeft = 15;
  const chartWidth = width - paddingLeft - paddingRight;

  const totalHeight = priceHeight + volHeight + rsiHeight + macdHeight + gap * 3 + 45;

  // Min and Max calculations for Price
  const { minPrice, maxPrice, maxVol, minMacd, maxMacd } = useMemo(() => {
    let minP = Infinity;
    let maxP = -Infinity;
    let maxV = 0;
    let minM = -0.5;
    let maxM = 0.5;

    for (const b of filteredBars) {
      if (b.low < minP) minP = b.low;
      if (b.high > maxP) maxP = b.high;
      if (showEma20 && typeof b.ema20 === 'number') {
        if (b.ema20 < minP) minP = b.ema20;
        if (b.ema20 > maxP) maxP = b.ema20;
      }
      if (showEma50 && typeof b.ema50 === 'number') {
        if (b.ema50 < minP) minP = b.ema50;
        if (b.ema50 > maxP) maxP = b.ema50;
      }
      if (showEma200 && typeof b.ema200 === 'number') {
        if (b.ema200 < minP) minP = b.ema200;
        if (b.ema200 > maxP) maxP = b.ema200;
      }
      if (b.volume > maxV) maxV = b.volume;
      if (b.macdHist !== undefined) {
        if (b.macdHist < minM) minM = b.macdHist;
        if (b.macdHist > maxM) maxM = b.macdHist;
      }
      if (b.macd !== undefined) {
        if (b.macd < minM) minM = b.macd;
        if (b.macd > maxM) maxM = b.macd;
      }
    }

    if (minP === Infinity) {
      minP = 100;
      maxP = 150;
    }
    const pad = (maxP - minP) * 0.05 || 1;
    return {
      minPrice: Math.max(0.1, minP - pad),
      maxPrice: maxP + pad,
      maxVol: maxV || 1,
      minMacd: minM,
      maxMacd: maxM
    };
  }, [filteredBars, showEma20, showEma50, showEma200]);

  // Coordinate mappers
  const n = filteredBars.length;
  const getX = (i: number) => paddingLeft + (i / Math.max(1, n - 1)) * chartWidth;
  const getYPrice = (val: number) =>
    priceHeight - ((val - minPrice) / (maxPrice - minPrice || 1)) * (priceHeight - 20) + 10;

  const yVolTop = priceHeight + gap;
  const getYVol = (v: number) => yVolTop + volHeight - (v / maxVol) * volHeight;

  const yRsiTop = yVolTop + volHeight + gap;
  const getYRsi = (val: number) => yRsiTop + rsiHeight - (val / 100) * rsiHeight;

  const yMacdTop = yRsiTop + rsiHeight + gap;
  const zeroMacdY = yMacdTop + macdHeight / 2;
  const getYMacd = (val: number) =>
    yMacdTop + macdHeight / 2 - (val / (Math.max(Math.abs(minMacd), Math.abs(maxMacd)) || 1)) * (macdHeight / 2);

  // SVG Paths without synthetic fallback to b.close
  const linePath = useMemo(() => {
    return filteredBars
      .map((b, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getYPrice(b.close).toFixed(1)}`)
      .join(' ');
  }, [filteredBars, minPrice, maxPrice]);

  const ema20Path = useMemo(() => {
    const pts: string[] = [];
    filteredBars.forEach((b, i) => {
      if (typeof b.ema20 === 'number' && Number.isFinite(b.ema20)) {
        pts.push(`${pts.length === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getYPrice(b.ema20).toFixed(1)}`);
      }
    });
    return pts.join(' ');
  }, [filteredBars, minPrice, maxPrice]);

  const ema50Path = useMemo(() => {
    const pts: string[] = [];
    filteredBars.forEach((b, i) => {
      if (typeof b.ema50 === 'number' && Number.isFinite(b.ema50)) {
        pts.push(`${pts.length === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getYPrice(b.ema50).toFixed(1)}`);
      }
    });
    return pts.join(' ');
  }, [filteredBars, minPrice, maxPrice]);

  const ema200Path = useMemo(() => {
    const pts: string[] = [];
    filteredBars.forEach((b, i) => {
      if (typeof b.ema200 === 'number' && Number.isFinite(b.ema200)) {
        pts.push(`${pts.length === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getYPrice(b.ema200).toFixed(1)}`);
      }
    });
    return pts.join(' ');
  }, [filteredBars, minPrice, maxPrice]);

  const rsiPath = useMemo(() => {
    return filteredBars
      .map((b, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getYRsi(b.rsi || 50).toFixed(1)}`)
      .join(' ');
  }, [filteredBars]);

  const macdPath = useMemo(() => {
    return filteredBars
      .map((b, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getYMacd(b.macd || 0).toFixed(1)}`)
      .join(' ');
  }, [filteredBars, minMacd, maxMacd]);

  const macdSignalPath = useMemo(() => {
    return filteredBars
      .map((b, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getYMacd(b.macdSignal || 0).toFixed(1)}`)
      .join(' ');
  }, [filteredBars, minMacd, maxMacd]);

  const activeBar = hoverIndex !== null ? filteredBars[hoverIndex] : (filteredBars.length > 0 ? filteredBars[filteredBars.length - 1] : null);

  return (
    <div className="space-y-4 pt-2">
      {/* Control Ribbon & Period Performance Matrix */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl text-xs">
        {/* Period Selector */}
        <div className="flex items-center gap-1 font-mono">
          <span className="text-slate-400 mr-1">Timeframe:</span>
          {(['1M', '3M', '6M', '1Y', '3Y', '5Y', 'Max'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 py-1 rounded transition-colors ${
                period === p
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Selected Period Return Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">{period} Gain:</span>
            <span className={`font-bold flex items-center gap-1 ${periodGainPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {periodGainPct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {periodGainPct >= 0 ? '+' : ''}{periodGainPct}%
              <span className="text-[11px] font-normal text-slate-400">
                ({periodGainAmount >= 0 ? '+' : '-'}{currSym}{Math.abs(periodGainAmount).toFixed(2)})
              </span>
            </span>
          </div>
          {startBar && endBar && (
            <span className="text-[10px] text-slate-500 font-sans">
              ({startBar.date}: {currSym}{startBar.close.toFixed(1)} → {endBar.date}: {currSym}{endBar.close.toFixed(1)})
            </span>
          )}
        </div>

        {/* Chart Style Toggle */}
        <div className="flex items-center gap-1 font-mono">
          <button
            onClick={() => setChartType('Candlestick')}
            className={`px-2.5 py-1 rounded transition-colors ${
              chartType === 'Candlestick'
                ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Candlestick
          </button>
          <button
            onClick={() => setChartType('Line')}
            className={`px-2.5 py-1 rounded transition-colors ${
              chartType === 'Line'
                ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Line
          </button>
        </div>

        {/* Overlay Toggles */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={showEma20}
              onChange={(e) => setShowEma20(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
            />
            <span className="text-amber-400 font-mono">EMA 20</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={showEma50}
              onChange={(e) => setShowEma50(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <span className="text-emerald-400 font-mono">EMA 50</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={showEma200}
              onChange={(e) => setShowEma200(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-purple-500 focus:ring-0"
            />
            <span className="text-purple-400 font-mono">
              EMA 200 {!hasEma200Data && <span className="text-[10px] text-slate-500">(Needs 200 Bars)</span>}
            </span>
          </label>
        </div>
      </div>

      {/* Matplotlib Quantitative Multi-Subplot Canvas */}
      <div className="bg-[#090d16] border border-slate-800 rounded-xl p-3 sm:p-4 overflow-hidden relative shadow-2xl">
        {/* Matplotlib Style Header Bar */}
        <div className="flex flex-wrap items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">{ticker}</span>
            <span>·</span>
            <span>Date: <strong className="text-slate-200">{activeBar?.date || 'N/A'}</strong></span>
            <span>·</span>
            <span>O: <strong className="text-slate-200">{activeBar ? `${currSym}${activeBar.open?.toFixed(2)}` : 'N/A'}</strong></span>
            <span>·</span>
            <span>H: <strong className="text-slate-200">{activeBar ? `${currSym}${activeBar.high?.toFixed(2)}` : 'N/A'}</strong></span>
            <span>·</span>
            <span>L: <strong className="text-slate-200">{activeBar ? `${currSym}${activeBar.low?.toFixed(2)}` : 'N/A'}</strong></span>
            <span>·</span>
            <span>C: <strong className="text-emerald-400">{activeBar ? `${currSym}${activeBar.close?.toFixed(2)}` : 'N/A'}</strong></span>
            <span>·</span>
            <span>Vol: <strong className="text-slate-200">{activeBar ? activeBar.volume?.toLocaleString() : 'N/A'}</strong></span>
          </div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>mplfinance / dark_background aesthetic</span>
          </div>
        </div>

        {filteredBars.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-3 font-mono">
            <BarChart2 className="w-10 h-10 text-slate-600" />
            <div className="text-sm font-semibold text-slate-300">Live market data unavailable</div>
            <p className="text-xs text-slate-500 max-w-sm">
              Live price candles could not be retrieved for {ticker}. Synthetic or random OHLC price generation is strictly disabled.
            </p>
          </div>
        ) : (
          <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${totalHeight}`}
          className="w-full h-auto cursor-crosshair select-none font-mono"
          onMouseMove={(e) => {
            if (!svgRef.current) return;
            const rect = svgRef.current.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width;
            const svgX = relX * width;
            const clampedX = Math.max(paddingLeft, Math.min(width - paddingRight, svgX));
            const i = Math.round(((clampedX - paddingLeft) / chartWidth) * (n - 1));
            setHoverIndex(Math.max(0, Math.min(n - 1, i)));
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="bullGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="bearGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Subplot 1: Price Action */}
          <g>
            <text x={paddingLeft} y={15} fill="#64748b" fontSize="9" fontWeight="bold">
              ax[0]: Price & Moving Averages ({quote.currency || 'INR'})
            </text>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
              const y = 10 + p * (priceHeight - 20);
              const val = maxPrice - p * (maxPrice - minPrice);
              return (
                <g key={`pgrid-${idx}`}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="#1e293b"
                    strokeWidth="0.8"
                    strokeDasharray="2 3"
                  />
                  <text x={width - paddingRight + 6} y={y + 3} fill="#64748b" fontSize="9">
                    {currSym}{val.toFixed(1)}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Subplot 2: Volume */}
          <g>
            <text x={paddingLeft} y={yVolTop - 4} fill="#64748b" fontSize="9" fontWeight="bold">
              ax[1]: Volume Traded
            </text>
            <line
              x1={paddingLeft}
              y1={yVolTop + volHeight}
              x2={width - paddingRight}
              y2={yVolTop + volHeight}
              stroke="#334155"
              strokeWidth="1"
            />
            <text x={width - paddingRight + 6} y={yVolTop + 12} fill="#64748b" fontSize="9">
              {(maxVol / 1000).toFixed(0)}k
            </text>
          </g>

          {/* Subplot 3: RSI (14) */}
          <g>
            <text x={paddingLeft} y={yRsiTop - 4} fill="#64748b" fontSize="9" fontWeight="bold">
              ax[2]: RSI (14) [Overbought: 70 / Oversold: 30]
            </text>
            {/* 70 Threshold */}
            <line
              x1={paddingLeft}
              y1={getYRsi(70)}
              x2={width - paddingRight}
              y2={getYRsi(70)}
              stroke="#f43f5e"
              strokeWidth="0.8"
              strokeDasharray="2 3"
            />
            <text x={width - paddingRight + 6} y={getYRsi(70) + 3} fill="#f43f5e" fontSize="8">
              70
            </text>
            {/* 50 Baseline */}
            <line
              x1={paddingLeft}
              y1={getYRsi(50)}
              x2={width - paddingRight}
              y2={getYRsi(50)}
              stroke="#334155"
              strokeWidth="0.6"
              strokeDasharray="1 2"
            />
            {/* 30 Threshold */}
            <line
              x1={paddingLeft}
              y1={getYRsi(30)}
              x2={width - paddingRight}
              y2={getYRsi(30)}
              stroke="#10b981"
              strokeWidth="0.8"
              strokeDasharray="2 3"
            />
            <text x={width - paddingRight + 6} y={getYRsi(30) + 3} fill="#10b981" fontSize="8">
              30
            </text>
          </g>

          {/* Subplot 4: MACD */}
          <g>
            <text x={paddingLeft} y={yMacdTop - 4} fill="#64748b" fontSize="9" fontWeight="bold">
              ax[3]: MACD (12, 26, 9) Histogram & Signal
            </text>
            <line
              x1={paddingLeft}
              y1={zeroMacdY}
              x2={width - paddingRight}
              y2={zeroMacdY}
              stroke="#475569"
              strokeWidth="1"
            />
            <text x={width - paddingRight + 6} y={zeroMacdY + 3} fill="#64748b" fontSize="8">
              0.00
            </text>
          </g>

          {/* Render Candlesticks or Line */}
          {chartType === 'Candlestick' ? (
            <g>
              {filteredBars.map((b, i) => {
                const x = getX(i);
                const candleWidth = Math.max(1.5, Math.min(8, (chartWidth / n) * 0.7));
                const isBull = b.close >= b.open;
                const candleColor = isBull ? '#10b981' : '#f43f5e';
                const yOpen = getYPrice(b.open);
                const yClose = getYPrice(b.close);
                const yHigh = getYPrice(b.high);
                const yLow = getYPrice(b.low);
                const candleTop = Math.min(yOpen, yClose);
                const candleHeight = Math.max(1, Math.abs(yClose - yOpen));

                return (
                  <g key={`bar-${i}`}>
                    {/* Wick */}
                    <line
                      x1={x}
                      y1={yHigh}
                      x2={x}
                      y2={yLow}
                      stroke={candleColor}
                      strokeWidth={candleWidth > 3 ? 1.2 : 0.8}
                    />
                    {/* Body */}
                    <rect
                      x={x - candleWidth / 2}
                      y={candleTop}
                      width={candleWidth}
                      height={candleHeight}
                      fill={candleColor}
                    />
                  </g>
                );
              })}
            </g>
          ) : (
            <path d={linePath} fill="none" stroke="#38bdf8" strokeWidth="2" />
          )}

          {/* Overlays */}
          {showEma20 && <path d={ema20Path} fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.9" />}
          {showEma50 && <path d={ema50Path} fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.9" />}
          {showEma200 && <path d={ema200Path} fill="none" stroke="#a855f7" strokeWidth="1.5" opacity="0.9" />}

          {/* Volume Bars */}
          <g>
            {filteredBars.map((b, i) => {
              const x = getX(i);
              const barW = Math.max(1, Math.min(6, (chartWidth / n) * 0.7));
              const y = getYVol(b.volume);
              const h = yVolTop + volHeight - y;
              const isBull = b.close >= b.open;
              return (
                <rect
                  key={`vol-${i}`}
                  x={x - barW / 2}
                  y={y}
                  width={barW}
                  height={Math.max(1, h)}
                  fill={isBull ? '#10b981' : '#f43f5e'}
                  opacity="0.6"
                />
              );
            })}
          </g>

          {/* RSI Line */}
          <path d={rsiPath} fill="none" stroke="#818cf8" strokeWidth="1.5" />

          {/* MACD Panel */}
          <g>
            {/* Histogram Bars */}
            {filteredBars.map((b, i) => {
              if (b.macdHist === undefined) return null;
              const x = getX(i);
              const barW = Math.max(1, Math.min(6, (chartWidth / n) * 0.7));
              const yVal = getYMacd(b.macdHist);
              const isPos = b.macdHist >= 0;
              const y = isPos ? yVal : zeroMacdY;
              const h = Math.abs(yVal - zeroMacdY);
              return (
                <rect
                  key={`mhist-${i}`}
                  x={x - barW / 2}
                  y={y}
                  width={barW}
                  height={Math.max(0.5, h)}
                  fill={isPos ? '#10b981' : '#f43f5e'}
                  opacity="0.75"
                />
              );
            })}
            {/* MACD and Signal Lines */}
            <path d={macdPath} fill="none" stroke="#38bdf8" strokeWidth="1.4" />
            <path d={macdSignalPath} fill="none" stroke="#fb923c" strokeWidth="1.4" strokeDasharray="2 2" />
          </g>

          {/* Interactive Hover Crosshair */}
          {hoverIndex !== null && (
            <g pointerEvents="none">
              <line
                x1={getX(hoverIndex)}
                y1={0}
                x2={getX(hoverIndex)}
                y2={totalHeight - 20}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getYPrice(filteredBars[hoverIndex].close)}
                r="3.5"
                fill="#38bdf8"
                stroke="#0f172a"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* X-axis Date Markers */}
          <g fill="#64748b" fontSize="9" fontFamily="monospace">
            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
              const i = Math.min(n - 1, Math.round(pct * (n - 1)));
              const b = filteredBars[i];
              if (!b) return null;
              return (
                <text key={`date-${idx}`} x={getX(i)} y={totalHeight - 6} textAnchor="middle">
                  {b.date}
                </text>
              );
            })}
          </g>
        </svg>
        )}
      </div>

      {/* Natural-Language Historical Chart Analysis Card */}
      {startBar && endBar && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                Natural-Language Historical Price Analysis ({period} Period)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              Verified OHLCV Observations ({filteredBars.length} Bars)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase block font-sans">Period Bounds</span>
              <div className="text-slate-200 font-bold">{startBar.date} → {endBar.date}</div>
              <div className="text-[10px] text-slate-400">{filteredBars.length} trading sessions</div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase block font-sans">Price Trajectory</span>
              <div className={`font-bold ${periodGainPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {periodGainAmount >= 0 ? 'Advanced' : 'Declined'} {periodGainAmount >= 0 ? '+' : '-'}{currSym}{Math.abs(periodGainAmount).toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-400">
                {currSym}{startBar.close.toFixed(2)} → {currSym}{endBar.close.toFixed(2)} ({periodGainPct >= 0 ? '+' : ''}{periodGainPct}%)
              </div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase block font-sans">Period Extremes</span>
              {(() => {
                const pHigh = filteredBars.reduce((m, b) => b.high > m.high ? b : m, filteredBars[0]);
                const pLow = filteredBars.reduce((m, b) => b.low < m.low ? b : m, filteredBars[0]);
                return (
                  <>
                    <div className="text-slate-200 font-bold">
                      H: {currSym}{pHigh.high.toFixed(1)} · L: {currSym}{pLow.low.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      High: {pHigh.date} | Low: {pLow.date}
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase block font-sans">Trend Classification</span>
              <div className="text-slate-200 font-bold">
                {periodGainPct >= 8
                  ? 'Sustained Uptrend'
                  : periodGainPct <= -8
                  ? 'Downward Trajectory'
                  : 'Sideways Consolidation'}
              </div>
              <div className="text-[10px] text-slate-400">
                {endBar.ema20 && endBar.close >= endBar.ema20 ? 'Above 20 EMA' : 'Below 20 EMA'}
                {endBar.ema50 ? ` · ${endBar.close >= endBar.ema50 ? 'Above 50 EMA' : 'Below 50 EMA'}` : ''}
              </div>
            </div>
          </div>

          {/* Narrative Summary and Limitations Note */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2 leading-relaxed font-sans">
            <p>
              <strong>Factual Period Summary:</strong> Over the {period} period from {startBar.date} to {endBar.date}, {ticker} {periodGainAmount >= 0 ? 'rose' : 'declined'} from {currSym}{startBar.close.toFixed(2)} to {currSym}{endBar.close.toFixed(2)}, representing an absolute change of {periodGainAmount >= 0 ? '+' : '-'}{currSym}{Math.abs(periodGainAmount).toFixed(2)} ({periodGainPct >= 0 ? '+' : ''}{periodGainPct}%). The stock reached an observed timeframe high of {currSym}{filteredBars.reduce((m, b) => b.high > m.high ? b : m, filteredBars[0]).high.toFixed(2)} and a low of {currSym}{filteredBars.reduce((m, b) => b.low < m.low ? b : m, filteredBars[0]).low.toFixed(2)}. The current price is {endBar.ema20 && endBar.close >= endBar.ema20 ? 'trading above' : 'trading below'} its 20-session EMA ({currSym}{endBar.ema20 ? endBar.ema20.toFixed(2) : 'N/A'}){endBar.ema200 ? ` and ${endBar.close >= endBar.ema200 ? 'above' : 'below'} its 200-session EMA (${currSym}${endBar.ema200.toFixed(2)})` : ''}.
            </p>
            <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
              <strong>Analytical Limitation:</strong> Historical price trajectory describes past market transaction consensus and does not constitute a complete assessment of the company's enterprise quality, balance-sheet solvency, or future equity performance.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
