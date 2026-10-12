import React from 'react';
import { ModelSignal, StockQuote } from '../../types';
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Crosshair,
  Shield,
  Target,
  Zap,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface TomorrowTradePageProps {
  signal: ModelSignal;
  quote: StockQuote;
}

export const TomorrowTradePage: React.FC<TomorrowTradePageProps> = ({ signal, quote }) => {
  const forecast = signal.tomorrowForecast;
  const setup = signal.professionalTradeSetup;

  if (!forecast || !setup) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 font-mono">
        Compiling trade execution levels for {quote.ticker}...
      </div>
    );
  }

  const isBuy = forecast.tradeAction === 'BUY';
  const isSell = forecast.tradeAction === 'SELL';
  const isHold = forecast.tradeAction === 'HOLD';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Main Action Directive Hero Banner */}
      <div className={`p-6 sm:p-8 rounded-2xl border transition-all ${
        isBuy
          ? 'bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border-emerald-500/50 shadow-xl shadow-emerald-950/20'
          : isSell
          ? 'bg-gradient-to-br from-rose-950/60 via-slate-900 to-slate-950 border-rose-500/50 shadow-xl shadow-rose-950/20'
          : 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/50 shadow-xl shadow-amber-950/20'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Next-Day Action Directive
            </span>
            <div className="flex items-center gap-3">
              <span className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                isBuy ? 'text-emerald-400' : isSell ? 'text-rose-400' : 'text-amber-400'
              }`}>
                {isBuy ? 'BUY / GO LONG' : isSell ? 'SELL / EXIT LONGS' : 'HOLD / WAIT FOR BREAKOUT'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Systematic quantitative setup for <strong className="text-slate-200">{quote.companyName} ({quote.ticker})</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono">
            <div className="bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 uppercase block font-sans">Current Price</span>
              <span className="text-lg font-bold text-slate-100">₹{quote.price.toFixed(2)}</span>
            </div>
            <div className="bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 uppercase block font-sans">Pre-Market Gap</span>
              <span className={`text-sm font-bold ${
                forecast.gapOutlook === 'GAP UP' ? 'text-emerald-400' : forecast.gapOutlook === 'GAP DOWN' ? 'text-rose-400' : 'text-slate-300'
              }`}>
                {forecast.gapOutlook}
              </span>
            </div>
          </div>
        </div>

        {/* 3 Prominent Decision Anchors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
          {/* Entry Trigger */}
          <div className="bg-slate-950/70 border border-slate-800/90 p-4 rounded-xl space-y-1 font-mono">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-semibold uppercase">1. Entry Zone</span>
              <Crosshair className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-lg font-bold text-slate-100">
              {setup.entryZone}
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Wait for limit trigger near support; do not chase market open spikes.
            </p>
          </div>

          {/* Hard Stop Loss */}
          <div className="bg-slate-950/70 border border-rose-900/60 p-4 rounded-xl space-y-1 font-mono">
            <div className="flex items-center justify-between text-rose-400 text-xs">
              <span className="font-bold uppercase">2. Hard Stop Loss</span>
              <Shield className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl font-bold text-rose-400">
              ₹{setup.stopLoss.toFixed(1)}
              <span className="text-xs font-normal ml-1.5 text-rose-500">
                ({setup.stopLossPct}%)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Strict invalidation floor to protect trade capital against drawdowns.
            </p>
          </div>

          {/* Take-Profit Targets */}
          <div className="bg-slate-950/70 border border-emerald-900/60 p-4 rounded-xl space-y-1 font-mono">
            <div className="flex items-center justify-between text-emerald-400 text-xs">
              <span className="font-bold uppercase">3. Targets (T1 / T2)</span>
              <Target className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-emerald-400">
              T1: ₹{setup.target1.toFixed(1)} <span className="text-xs font-normal text-slate-400">/</span> T2: ₹{setup.target2.toFixed(1)}
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              Book 50% profit at T1 (+{setup.target1Pct}%) and trail stop to breakeven for T2 runner (+{setup.target2Pct}%).
            </p>
          </div>
        </div>
      </div>

      {/* 2. Institutional Market Flow & Levels */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400" />
          Intraday Flow & Key Price Decision Levels
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <span className="text-slate-400 text-[11px] uppercase block">Price vs VWAP</span>
            <div className={`text-sm font-bold ${
              setup.priceVsVwap.includes('BULLISH') ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {setup.priceVsVwap}
            </div>
            <div className="text-[10px] text-slate-500">Benchmark: ₹{setup.vwap.toFixed(1)}</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <span className="text-slate-400 text-[11px] uppercase block">Delivery Volume</span>
            <div className="text-sm font-bold text-slate-200">
              {setup.deliveryVolumePct}%
            </div>
            <div className="text-[10px] text-slate-500">{setup.institutionalBias}</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <span className="text-slate-400 text-[11px] uppercase block">Central Floor Pivot</span>
            <div className="text-sm font-bold text-amber-400">
              ₹{forecast.pivotPoint.toFixed(1)}
            </div>
            <div className="text-[10px] text-slate-500">Intraday Bias Trigger</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <span className="text-slate-400 text-[11px] uppercase block">Breakout Levels</span>
            <div className="text-xs space-y-0.5 font-bold">
              <span className="text-emerald-400 block">R1: ₹{forecast.resistanceLevel.toFixed(1)}</span>
              <span className="text-rose-400 block">S1: ₹{forecast.supportLevel.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Execution Directive Summary */}
        <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-300">
          <strong className="text-slate-100 font-semibold font-mono block">
            Trader Execution Rules:
          </strong>
          <p className="leading-relaxed font-sans">
            {setup.traderPlaybook}
          </p>
        </div>
      </div>
    </div>
  );
};
