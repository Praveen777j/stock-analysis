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
  const currSym = quote.currency === 'USD' ? '$' : '₹';

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
              {quote.lastUpdated && <span className="ml-2 text-slate-500">· Feed: {quote.lastUpdated}</span>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono">
            <div className="bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 uppercase block font-sans">Current Price</span>
              <span className="text-lg font-bold text-slate-100">{currSym}{quote.price.toFixed(2)}</span>
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
              Base Trigger: {currSym}{setup.triggerPrice.toFixed(1)}. Limit orders in zone; do not chase open gap spikes.
            </p>
          </div>

          {/* Hard Stop Loss */}
          <div className="bg-slate-950/70 border border-rose-900/60 p-4 rounded-xl space-y-1 font-mono">
            <div className="flex items-center justify-between text-rose-400 text-xs">
              <span className="font-bold uppercase">2. Hard Stop Loss</span>
              <Shield className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl font-bold text-rose-400">
              {currSym}{setup.stopLoss.toFixed(1)}
              <span className="text-xs font-normal ml-1.5 text-rose-500">
                ({setup.stopLossPct}%)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              {isBuy
                ? `Placed strictly below entry at support (${currSym}${setup.stopLoss.toFixed(1)}) to cap maximum drawdown.`
                : `Placed strictly above entry at overhead resistance (${currSym}${setup.stopLoss.toFixed(1)}) for short protection.`}
            </p>
          </div>

          {/* Take-Profit Targets */}
          <div className="bg-slate-950/70 border border-emerald-900/60 p-4 rounded-xl space-y-1 font-mono">
            <div className="flex items-center justify-between text-emerald-400 text-xs">
              <span className="font-bold uppercase">3. Targets & R:R</span>
              <Target className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-emerald-400">
              T1: {currSym}{setup.target1.toFixed(1)} <span className="text-xs font-normal text-slate-400">/</span> T2: {currSym}{setup.target2.toFixed(1)}
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              T1 R:R ~ 1:1.8 (+{setup.target1Pct}%) · T2 R:R ~ 1:3.0 (+{setup.target2Pct}%) · Blended: {setup.riskRewardRatio}
            </p>
          </div>
        </div>

        {/* Sell / Short Distinction Notice when Bearish */}
        {isSell && (
          <div className="mt-4 p-3.5 bg-rose-950/40 border border-rose-900/60 rounded-xl text-xs text-rose-200/90 leading-relaxed font-sans">
            <strong>Execution Discipline Note:</strong> This SELL signal directs traders holding open long positions to exit and preserve capital. Initiating a new short position requires a confirmed breakdown below intraday S1 support ({currSym}{forecast.supportLevel.toFixed(1)}); do not assume an automatic short without confirmation.
          </div>
        )}
      </div>

      {/* 2. Institutional Market Flow & Levels */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Intraday Flow & Key Price Decision Levels
          </h4>
          <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-950 border border-slate-800 text-emerald-400">
            Blended Execution R:R: {setup.riskRewardRatio}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <span className="text-slate-400 text-[11px] uppercase block">Price vs VWAP</span>
            <div className={`text-sm font-bold ${
              setup.priceVsVwap.includes('BULLISH') ? 'text-emerald-400' : setup.priceVsVwap.includes('BEARISH') ? 'text-rose-400' : 'text-slate-300'
            }`}>
              {setup.priceVsVwap}
            </div>
            <div className="text-[10px] text-slate-500">
              Benchmark: {currSym}{setup.vwap.toFixed(1)} {setup.priceVsVwap === 'UNAVAILABLE' ? '(Insufficient Data)' : ''}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <span className="text-slate-400 text-[11px] uppercase block">Delivery Volume</span>
            <div className="text-sm font-bold text-slate-200">
              {setup.deliveryVolumePct !== null && setup.deliveryVolumePct > 0 ? `${setup.deliveryVolumePct}%` : 'N/A (Clearing Feed Required)'}
            </div>
            <div className="text-[10px] text-slate-500">
              {setup.institutionalBias === 'UNAVAILABLE' ? 'Direct Clearing Feed Required' : setup.institutionalBias}
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <span className="text-slate-400 text-[11px] uppercase block">Central Floor Pivot</span>
            <div className="text-sm font-bold text-amber-400">
              {currSym}{forecast.pivotPoint.toFixed(1)}
            </div>
            <div className="text-[10px] text-slate-500">Intraday Bias Trigger</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl space-y-1">
            <span className="text-slate-400 text-[11px] uppercase block">Breakout Levels</span>
            <div className="text-xs space-y-0.5 font-bold">
              <span className="text-emerald-400 block">R1: {currSym}{forecast.resistanceLevel.toFixed(1)}</span>
              <span className="text-rose-400 block">S1: {currSym}{forecast.supportLevel.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Execution Directive Summary */}
        <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-300">
          <div className="flex items-center justify-between">
            <strong className="text-slate-100 font-semibold font-mono block">
              Trader Execution Rules:
            </strong>
            <span className="text-[11px] font-mono text-slate-400">
              Assumed Entry: {currSym}{setup.triggerPrice.toFixed(1)} · Target Blended R:R: {setup.riskRewardRatio}
            </span>
          </div>
          <p className="leading-relaxed font-sans">
            {setup.traderPlaybook}
          </p>
        </div>
      </div>
    </div>
  );
};
