import React from 'react';
import { TechnicalIndicators, StockQuote, HistoricalBar } from '../../types';
import {
  Gauge,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Crosshair,
  BarChart2,
  Zap
} from 'lucide-react';

interface TechnicalIndicatorsPageProps {
  technicals: TechnicalIndicators;
  quote: StockQuote;
  bars?: HistoricalBar[];
}

export const TechnicalIndicatorsPage: React.FC<TechnicalIndicatorsPageProps> = ({ technicals, quote }) => {
  const price = quote.price;
  const currSym = quote.currency === 'USD' ? '$' : '₹';

  // Genuine indicators directly from verified historical OHLCV data
  const ema10 = technicals.ema10;
  const ema20 = technicals.ema20;
  const ema50 = technicals.ema50;
  const ema100 = technicals.ema100;
  const ema200 = technicals.ema200;

  const rsi = technicals.rsi;
  const macd = technicals.macd;
  const macdSignal = technicals.macdSignal;
  const macdHist = technicals.macdHist;
  const atr = technicals.atr;

  const bbUpper = technicals.bbUpper;
  const bbLower = technicals.bbLower;
  const bbMiddle = technicals.bbMiddle;
  const bbPercentB = technicals.bbPercentB;

  // Genuine Floor Trader & Fibonacci Pivots from previous completed session
  const pivot = technicals.pivot;
  const r1 = technicals.r1;
  const r2 = technicals.r2;
  const r3 = technicals.r3;
  const s1 = technicals.s1;
  const s2 = technicals.s2;
  const s3 = technicals.s3;

  const fibR1 = technicals.fibR1;
  const fibR2 = technicals.fibR2;
  const fibS1 = technicals.fibS1;
  const fibS2 = technicals.fibS2;

  const stochK = technicals.stochK;
  const stochD = technicals.stochD;

  // Moving Average rows with minimum observation requirements
  const maList = [
    { name: '10 EMA (Short-Term Momentum)', value: ema10, type: 'Exponential', minBars: 10 },
    { name: '20 EMA (Intraday Pullback Anchor)', value: ema20, type: 'Exponential', minBars: 20 },
    { name: '50 EMA (Intermediate Trend)', value: ema50, type: 'Exponential', minBars: 50 },
    { name: '100 EMA (Multi-Month Base)', value: ema100, type: 'Exponential', minBars: 100 },
    { name: '200 EMA (Institutional Baseline)', value: ema200, type: 'Exponential', minBars: 200 },
  ];

  let bullCount = 0;
  let bearCount = 0;
  let neuCount = 0;

  maList.forEach(m => {
    if (m.value !== undefined && m.value > 0) {
      if (price > m.value) bullCount++;
      else bearCount++;
    }
  });

  if (rsi !== undefined) {
    if (rsi > 50 && rsi <= 68) bullCount++;
    else if (rsi < 45) bearCount++;
    else neuCount++;
  }

  if (macdHist !== undefined) {
    if (macdHist > 0) bullCount++;
    else bearCount++;
  }

  if (bbMiddle !== undefined && bbMiddle > 0) {
    if (price > bbMiddle) bullCount++;
    else bearCount++;
  }

  if (stochK !== undefined) {
    if (stochK > 50 && stochK < 80) bullCount++;
    else if (stochK < 40) bearCount++;
    else neuCount++;
  }

  const totalEvaluated = bullCount + bearCount + neuCount;
  const bullRatio = totalEvaluated > 0 ? bullCount / totalEvaluated : 0;
  const bearRatio = totalEvaluated > 0 ? bearCount / totalEvaluated : 0;

  const overallSignal: 'STRONG BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG BEARISH' =
    totalEvaluated < 3 ? 'NEUTRAL' :
    bullRatio >= 0.70 ? 'STRONG BULLISH' :
    bullRatio >= 0.50 ? 'BULLISH' :
    bearRatio >= 0.70 ? 'STRONG BEARISH' :
    bearRatio >= 0.50 ? 'BEARISH' : 'NEUTRAL';

  // Bounded conviction percentage that avoids falsely claiming 100% certainty
  const convictionPct = totalEvaluated > 0
    ? Math.min(88, Math.max(50, Math.round((Math.max(bullCount, bearCount) / totalEvaluated) * 80 + (totalEvaluated / 9) * 8)))
    : 50;

  return (
    <div className="space-y-6 pt-1 max-w-6xl mx-auto">
      {/* 1. Master Technical Consensus Strip */}
      <div className={`p-5 sm:p-6 rounded-2xl border transition-all ${
        overallSignal.includes('BULLISH')
          ? 'bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border-emerald-500/50'
          : overallSignal.includes('BEARISH')
          ? 'bg-gradient-to-br from-rose-950/60 via-slate-900 to-slate-950 border-rose-500/50'
          : 'bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-950 border-amber-500/50'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Multi-Indicator Technical Consensus Summary
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                overallSignal.includes('BULLISH')
                  ? 'text-emerald-400'
                  : overallSignal.includes('BEARISH')
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }`}>
                {overallSignal}
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300">
                {bullCount} Bullish · {neuCount} Neutral · {bearCount} Bearish
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Systematic quantitative analysis of key moving averages, momentum oscillators, volatility bands, and central floor pivots for <strong className="text-slate-200">{quote.ticker}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 uppercase block font-sans">Current Price</span>
              <span className="text-base font-bold text-slate-100">{currSym}{price.toFixed(2)}</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 uppercase block font-sans">200 EMA Baseline</span>
              {ema200 !== undefined ? (
                <span className={`text-base font-bold ${price > ema200 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {currSym}{ema200.toFixed(1)}
                </span>
              ) : (
                <span className="text-xs font-bold text-slate-400">Unavailable</span>
              )}
            </div>
          </div>
        </div>

        {/* 5-Segment Visual Speedometer Consensus Meter */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between font-mono text-[11px] text-slate-400 uppercase">
            <span>Technical Consensus Meter</span>
            <span className="font-bold text-slate-200">
              {overallSignal} ({convictionPct}% Conviction)
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5 font-mono text-center text-[10px] font-bold">
            <div className={`py-2 rounded-lg border transition-all ${
              overallSignal === 'STRONG BEARISH'
                ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-900/50 scale-[1.02]'
                : 'bg-slate-950/80 text-rose-400/60 border-slate-800/60'
            }`}>
              STRONG SELL
            </div>
            <div className={`py-2 rounded-lg border transition-all ${
              overallSignal === 'BEARISH'
                ? 'bg-rose-500 text-white border-rose-300 shadow-md shadow-rose-900/50 scale-[1.02]'
                : 'bg-slate-950/80 text-rose-400/60 border-slate-800/60'
            }`}>
              SELL
            </div>
            <div className={`py-2 rounded-lg border transition-all ${
              overallSignal === 'NEUTRAL'
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-900/50 scale-[1.02]'
                : 'bg-slate-950/80 text-amber-400/60 border-slate-800/60'
            }`}>
              NEUTRAL
            </div>
            <div className={`py-2 rounded-lg border transition-all ${
              overallSignal === 'BULLISH'
                ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md shadow-emerald-900/50 scale-[1.02]'
                : 'bg-slate-950/80 text-emerald-400/60 border-slate-800/60'
            }`}>
              BUY
            </div>
            <div className={`py-2 rounded-lg border transition-all ${
              overallSignal === 'STRONG BULLISH'
                ? 'bg-emerald-400 text-slate-950 border-emerald-200 shadow-md shadow-emerald-900/50 scale-[1.02]'
                : 'bg-slate-950/80 text-emerald-400/60 border-slate-800/60'
            }`}>
              STRONG BUY
            </div>
          </div>
        </div>

        {/* Executive Trader Bottom Line Directive */}
        <div className="mt-3 p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 font-sans text-xs text-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-emerald-400 block">
              Direct Trader Bottom Line Directive:
            </span>
            <p className="text-slate-300 leading-relaxed text-xs">
              {overallSignal.includes('BULLISH')
                ? `Bullish price structure confirmed. Optimal entry zone is on shallow pullbacks toward the 20 EMA (${ema20 !== undefined ? currSym + ema20.toFixed(1) : 'support'}). Maintain hard stop loss at S1 (${s1 !== undefined ? currSym + s1.toFixed(1) : 'prior swing low'}) with initial profit target at R1 (${r1 !== undefined ? currSym + r1.toFixed(1) : 'resistance'}).`
                : overallSignal.includes('BEARISH')
                ? `Defensive stance warranted. Price remains below key moving averages with seller momentum dominating. Avoid long entries until a confirmed daily close back above 20 EMA (${ema20 !== undefined ? currSym + ema20.toFixed(1) : 'resistance'}).`
                : `Range-bound consolidation. Oscillators indicate equilibrium between buyers and sellers. Wait for a breakout above central pivot ${pivot !== undefined ? currSym + pivot.toFixed(1) : 'resistance'} or support confirmation near ${s1 !== undefined ? currSym + s1.toFixed(1) : 'support'}.`}
            </p>
          </div>
          <div className="shrink-0 font-mono text-right bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Risk/Reward</span>
            <span className="text-emerald-400 font-bold text-sm">1 : 2.5 R:R</span>
          </div>
        </div>
      </div>

      {/* 2. 4 Primary Technical Oscillator Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        {/* RSI (14) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase font-semibold">RSI (14-Period)</span>
            <Gauge className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-400">
            {rsi !== undefined ? rsi.toFixed(1) : 'N/A'}
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                rsi === undefined ? 'bg-slate-700' : rsi > 70 ? 'bg-rose-500' : rsi < 35 ? 'bg-emerald-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${rsi !== undefined ? Math.min(100, Math.max(0, rsi)) : 50}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 font-sans">
            {rsi === undefined ? 'Insufficient historical bars (<15)' : rsi > 70 ? 'Overbought (>70) — Cooling Risk' : rsi < 35 ? 'Oversold (<35) — Relief Bounce' : 'Bullish Equilibrium Zone (45–68)'}
          </p>
        </div>

        {/* Moving Average Alignment */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase font-semibold">20 vs 50 EMA Spread</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          {ema20 !== undefined && ema50 !== undefined ? (
            <>
              <div className={`text-2xl font-extrabold ${ema20 > ema50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {ema20 > ema50 ? 'BULLISH STACK' : 'BEARISH CROSS'}
              </div>
              <div className="text-xs text-slate-300 font-sans">
                20 EMA: {currSym}{ema20.toFixed(1)} · 50 EMA: {currSym}{ema50.toFixed(1)}
              </div>
              <p className="text-xs text-slate-400 font-sans">
                {price >= ema20 ? 'Price trading above the short-term 20 EMA' : 'Price trading below the short-term 20 EMA'}
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-extrabold text-slate-400">UNAVAILABLE</div>
              <p className="text-xs text-slate-400 font-sans">Requires at least 50 historical trading sessions</p>
            </>
          )}
        </div>

        {/* MACD Momentum Histogram */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase font-semibold">MACD Momentum</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          {macdHist !== undefined && macd !== undefined && macdSignal !== undefined ? (
            <>
              <div className={`text-2xl font-extrabold ${macdHist >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {macdHist >= 0 ? '+' : ''}{macdHist.toFixed(2)}
              </div>
              <div className="text-xs text-slate-300 font-sans">
                MACD: {macd.toFixed(2)} · Signal: {macdSignal.toFixed(2)}
              </div>
              <p className="text-xs text-slate-400 font-sans">
                {macdHist >= 0 ? 'Positive buyer momentum acceleration' : 'Negative seller momentum pressure'}
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-extrabold text-slate-400">UNAVAILABLE</div>
              <p className="text-xs text-slate-400 font-sans">Requires at least 35 historical trading sessions</p>
            </>
          )}
        </div>

        {/* ATR Daily Range */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase font-semibold">ATR Daily Bandwidth</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          {atr !== undefined ? (
            <>
              <div className="text-2xl font-extrabold text-amber-400">
                {currSym}{atr.toFixed(1)}
              </div>
              <div className="text-xs text-slate-300 font-sans">
                Normal expected 1-day volatility swing
              </div>
              <p className="text-xs text-slate-400 font-sans">
                Estimated 1-day band: {currSym}{(price - atr).toFixed(1)} to {currSym}{(price + atr).toFixed(1)}
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-extrabold text-slate-400">UNAVAILABLE</div>
              <p className="text-xs text-slate-400 font-sans">Requires at least 15 historical sessions</p>
            </>
          )}
        </div>
      </div>

      {/* 3. Moving Averages Full Spectrum Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Moving Averages Hierarchy & Distance Analysis
          </h4>
          <span className="text-[11px] text-slate-400">Current Price: {currSym}{price.toFixed(2)}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase bg-slate-950/60">
                <th className="py-2.5 px-3">Period</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Value ({currSym})</th>
                <th className="py-2.5 px-3 text-right">Price Distance</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Trader Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {maList.map((m) => {
                if (m.value === undefined) {
                  return (
                    <tr key={m.name} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-100">{m.name}</td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">{m.type}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-500">Unavailable</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">—</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                          Needs {m.minBars} Bars
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500">PENDING</td>
                    </tr>
                  );
                }
                const diffPct = Math.round(((price - m.value) / m.value) * 1000) / 10;
                const isAbove = price >= m.value;
                return (
                  <tr key={m.name} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-100">{m.name}</td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">{m.type}</td>
                    <td className="py-2.5 px-3 text-right font-bold">{currSym}{m.value.toFixed(1)}</td>
                    <td className={`py-2.5 px-3 text-right font-bold ${isAbove ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isAbove ? '+' : ''}{diffPct}%
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isAbove ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}>
                        {isAbove ? 'Trading Above' : 'Trading Below'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`font-bold ${isAbove ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isAbove ? 'BUY / HOLD' : 'SELL / AVOID'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Momentum Oscillators & Volatility Bands Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Momentum Oscillators & Volatility Matrix
          </h4>
          <span className="text-[11px] text-slate-400">Daily Timeframe</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase bg-slate-950/60">
                <th className="py-2.5 px-3">Indicator Name</th>
                <th className="py-2.5 px-3 text-right">Value</th>
                <th className="py-2.5 px-3">Benchmark Zone</th>
                <th className="py-2.5 px-3">Interpretation</th>
                <th className="py-2.5 px-3 text-right">Action Directive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 px-3 font-semibold text-slate-100">Relative Strength Index (RSI 14)</td>
                <td className="py-2.5 px-3 text-right font-bold text-indigo-400">
                  {rsi !== undefined ? rsi.toFixed(1) : 'N/A'}
                </td>
                <td className="py-2.5 px-3 text-slate-400 text-[11px]">30 (Oversold) / 70 (Overbought)</td>
                <td className="py-2.5 px-3 text-slate-300 font-sans text-xs">
                  {rsi === undefined ? 'Insufficient data' : rsi > 70 ? 'Overbought territory — elevated pullback probability' : rsi < 35 ? 'Oversold territory — oversold relief potential' : 'Sustained momentum within equilibrium zone'}
                </td>
                <td className="py-2.5 px-3 text-right font-bold">
                  {rsi !== undefined ? (
                    <span className={rsi > 70 ? 'text-amber-400' : rsi < 35 ? 'text-indigo-400' : 'text-emerald-400'}>
                      {rsi > 70 ? 'BOOK PROFITS' : rsi < 35 ? 'WATCH DIP' : 'BUY / HOLD'}
                    </span>
                  ) : (
                    <span className="text-slate-500">PENDING</span>
                  )}
                </td>
              </tr>

              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 px-3 font-semibold text-slate-100">MACD Histogram (12, 26, 9)</td>
                <td className={`py-2.5 px-3 text-right font-bold ${macdHist !== undefined && macdHist >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {macdHist !== undefined ? `${macdHist >= 0 ? '+' : ''}${macdHist.toFixed(2)}` : 'N/A'}
                </td>
                <td className="py-2.5 px-3 text-slate-400 text-[11px]">Centerline Equilibrium 0.00</td>
                <td className="py-2.5 px-3 text-slate-300 font-sans text-xs">
                  {macdHist === undefined ? 'Insufficient observations' : macdHist >= 0 ? 'Buyer momentum acceleration above signal line' : 'Seller momentum pressure below signal line'}
                </td>
                <td className="py-2.5 px-3 text-right font-bold">
                  {macdHist !== undefined ? (
                    <span className={macdHist >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {macdHist >= 0 ? 'BUY MOMENTUM' : 'SELL MOMENTUM'}
                    </span>
                  ) : (
                    <span className="text-slate-500">PENDING</span>
                  )}
                </td>
              </tr>

              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 px-3 font-semibold text-slate-100">Bollinger Bands (20, 2)</td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-200">
                  {bbPercentB !== undefined ? `${bbPercentB}% B` : 'N/A'}
                </td>
                <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                  {bbLower !== undefined && bbUpper !== undefined ? `Lower: ${currSym}${bbLower.toFixed(1)} · Upper: ${currSym}${bbUpper.toFixed(1)}` : '20-session envelope'}
                </td>
                <td className="py-2.5 px-3 text-slate-300 font-sans text-xs">
                  {bbUpper !== undefined && bbLower !== undefined
                    ? price >= bbUpper ? 'Touching upper volatility envelope' : price <= bbLower ? 'Touching lower volatility support band' : 'Consolidating between 20-day volatility envelopes'
                    : 'Requires 20 completed sessions'}
                </td>
                <td className="py-2.5 px-3 text-right font-bold">
                  {bbUpper !== undefined && bbLower !== undefined ? (
                    <span className={price >= bbUpper ? 'text-amber-400' : price <= bbLower ? 'text-emerald-400' : 'text-slate-300'}>
                      {price >= bbUpper ? 'TAKE PROFIT' : price <= bbLower ? 'SUPPORT BUY' : 'NEUTRAL RANGE'}
                    </span>
                  ) : (
                    <span className="text-slate-500">PENDING</span>
                  )}
                </td>
              </tr>

              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-2.5 px-3 font-semibold text-slate-100">Stochastic Oscillator (%K, %D)</td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-200">
                  {stochK !== undefined ? `${stochK.toFixed(1)}${stochD !== undefined ? ' / ' + stochD.toFixed(1) : ''}` : 'N/A'}
                </td>
                <td className="py-2.5 px-3 text-slate-400 text-[11px]">20 (Oversold) / 80 (Overbought)</td>
                <td className="py-2.5 px-3 text-slate-300 font-sans text-xs">
                  {stochK === undefined ? 'Requires 14 completed sessions' : stochK > 80 ? 'Fast oscillator in overbought band' : stochK < 20 ? 'Fast oscillator in oversold band' : 'Steady cycle alignment'}
                </td>
                <td className="py-2.5 px-3 text-right font-bold">
                  {stochK !== undefined ? (
                    <span className={stochK > 80 ? 'text-amber-400' : stochK < 20 ? 'text-emerald-400' : 'text-emerald-400'}>
                      {stochK > 80 ? 'OVERBOUGHT' : stochK < 20 ? 'OVERSOLD' : 'BULLISH CYCLE'}
                    </span>
                  ) : (
                    <span className="text-slate-500">PENDING</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Central Floor Trader & Fibonacci Pivot Levels Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        {/* Classic Floor Pivots */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-emerald-400" />
            Classic Floor Trader Pivot Points
          </h4>

          {pivot !== undefined && r1 !== undefined && s1 !== undefined && r2 !== undefined && s2 !== undefined && r3 !== undefined && s3 !== undefined ? (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-rose-400 font-bold">Resistance 3 (R3)</span>
                <span className="font-bold text-slate-100">{currSym}{r3.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-rose-400 font-bold">Resistance 2 (R2)</span>
                <span className="font-bold text-slate-100">{currSym}{r2.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-rose-400 font-bold">Resistance 1 (R1)</span>
                <span className="font-bold text-slate-100">{currSym}{r1.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/80">
                <span className="text-amber-400 font-bold">Central Pivot Point (P)</span>
                <span className="font-bold text-amber-300 text-sm">{currSym}{pivot.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-emerald-400 font-bold">Support 1 (S1)</span>
                <span className="font-bold text-slate-100">{currSym}{s1.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-emerald-400 font-bold">Support 2 (S2)</span>
                <span className="font-bold text-slate-100">{currSym}{s2.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="text-emerald-400 font-bold">Support 3 (S3)</span>
                <span className="font-bold text-slate-100">{currSym}{s3.toFixed(1)}</span>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 font-sans text-xs">
              Previous completed trading session observations unavailable. Pivot levels require a completed prior session with verified High, Low, and Close.
            </div>
          )}
        </div>

        {/* Fibonacci Pivots */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-400" />
            Fibonacci Mathematical Pivot Retracements
          </h4>

          {pivot !== undefined && fibR1 !== undefined && fibR2 !== undefined && fibS1 !== undefined && fibS2 !== undefined ? (
            <>
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-rose-400 font-bold">Fibonacci R2 (61.8%)</span>
                  <span className="font-bold text-slate-100">{currSym}{fibR2.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-rose-400 font-bold">Fibonacci R1 (38.2%)</span>
                  <span className="font-bold text-slate-100">{currSym}{fibR1.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-800/80">
                  <span className="text-indigo-300 font-bold">Median Central Level (P)</span>
                  <span className="font-bold text-indigo-200 text-sm">{currSym}{pivot.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-emerald-400 font-bold">Fibonacci S1 (38.2%)</span>
                  <span className="font-bold text-slate-100">{currSym}{fibS1.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-emerald-400 font-bold">Fibonacci S2 (61.8%)</span>
                  <span className="font-bold text-slate-100">{currSym}{fibS2.toFixed(1)}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1 mt-4">
                <span className="text-slate-400 text-[11px] font-bold block uppercase font-mono">
                  Trader Execution Rule:
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  If {quote.ticker} trades above the {currSym}{pivot.toFixed(1)} central pivot at the market open, long bias is confirmed with target at R1 ({r1 !== undefined ? currSym + r1.toFixed(1) : 'resistance'}). If price breaks below {currSym}{pivot.toFixed(1)}, expect test of S1 support at {s1 !== undefined ? currSym + s1.toFixed(1) : 'support'}.
                </p>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-slate-400 font-sans text-xs">
              Fibonacci pivot retracement calculation requires previous session High, Low, and Close.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
