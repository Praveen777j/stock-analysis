import React from 'react';
import { ModelSignal, StockQuote } from '../../types';
import {
  Crosshair,
  Shield,
  Target,
  Zap,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface ProTraderDeskPageProps {
  signal: ModelSignal;
  quote: StockQuote;
  onNavigate?: (pageId: string) => void;
}

export const ProTraderDeskPage: React.FC<ProTraderDeskPageProps> = ({ signal, quote, onNavigate }) => {
  const setup = signal.professionalTradeSetup;

  if (!setup) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        Trade execution levels are being compiled for {quote.ticker}...
      </div>
    );
  }

  const isLong = setup.bias.includes('BULLISH') || setup.bias.includes('MOMENTUM');

  return (
    <div className="space-y-6 pt-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded bg-indigo-500/20 text-indigo-400">
              <Crosshair className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-slate-100 font-mono">
              Tomorrow Trade Desk & Execution Blueprint — {quote.ticker}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict risk-reward execution plan: limit entry anchors, invalidation stop loss, profit targets, and volume footprint.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded font-bold uppercase bg-indigo-950 text-indigo-300 border border-indigo-700">
            {setup.bias}
          </span>
          <span className="px-2.5 py-1 rounded font-bold uppercase bg-slate-800 text-slate-200 border border-slate-700">
            R:R {setup.riskRewardRatio}
          </span>
        </div>
      </div>

      {/* Main 4 Key Execution Anchor Levels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        {/* Entry Zone */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs uppercase font-semibold">
            <span>Entry Zone</span>
            <Crosshair className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-base font-bold text-slate-100">
            {setup.entryZone}
          </div>
          <p className="text-[11px] text-slate-400 font-sans leading-snug">
            Trigger price: ₹{setup.triggerPrice.toFixed(2)}. Enter only within defined limit boundaries to maintain positive risk asymmetry.
          </p>
        </div>

        {/* Hard Stop Loss */}
        <div className="bg-slate-900/80 border border-rose-900/60 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-rose-400 text-xs uppercase font-bold">
            <span>Hard Stop Loss</span>
            <Shield className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">
            ₹{setup.stopLoss.toFixed(1)}
            <span className="text-xs ml-1.5 font-normal text-rose-500">
              (-{setup.stopLossPct}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans leading-snug">
            1.4x ATR invalidation barrier. Mandatory protective exit if session breaks below this level.
          </p>
        </div>

        {/* Target 1 (Partial Profit Booking) */}
        <div className="bg-slate-900/80 border border-emerald-900/60 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-emerald-400 text-xs uppercase font-bold">
            <span>Target 1 (Book 50%)</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            ₹{setup.target1.toFixed(1)}
            <span className="text-xs ml-1.5 font-normal">
              (+{setup.target1Pct}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans leading-snug">
            1.8x R:R primary take-profit objective. Lock in half gains and trail stop loss to breakeven entry.
          </p>
        </div>

        {/* Target 2 (Runner Target) */}
        <div className="bg-slate-900/80 border border-emerald-900/60 p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-emerald-400 text-xs uppercase font-bold">
            <span>Target 2 (Runner)</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            ₹{setup.target2.toFixed(1)}
            <span className="text-xs ml-1.5 font-normal">
              (+{setup.target2Pct}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans leading-snug">
            3.2x R:R swing expansion target for remaining open runner position.
          </p>
        </div>
      </div>

      {/* Institutional Smart Money Footprint Grid */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-indigo-400" />
            Institutional Smart Money Footprint & Order Flow
          </h4>
          <span className="text-[11px] text-slate-400">
            Real-time delivery & VWAP benchmark
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px]">Price vs Benchmark VWAP</span>
            <div className={`text-base font-bold ${
              setup.priceVsVwap.includes('BULLISH') ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {setup.priceVsVwap}
            </div>
            <div className="text-[10px] text-slate-500">
              Institutional benchmark price: ₹{setup.vwap.toFixed(2)}
            </div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px]">Delivery Volume Ratio</span>
            <div className="text-base font-bold text-slate-100">
              {setup.deliveryVolumePct !== null && setup.deliveryVolumePct > 0 ? `${setup.deliveryVolumePct}% (${setup.institutionalBias})` : 'N/A (Clearing Feed Required)'}
            </div>
            <div className="text-[10px] text-slate-500">
              {setup.deliveryVolumePct !== null && setup.deliveryVolumePct > 50 ? 'Strong institutional accumulation' : setup.deliveryVolumePct !== null ? 'Normal retail turnover' : 'Direct clearing feed required'}
            </div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[11px]">Multi-Timeframe Alignment</span>
            <div className="text-base font-bold text-indigo-400">
              {setup.multiTimeframeConfluence.confluenceRating}
            </div>
            <div className="text-[10px] text-slate-500">
              Daily: {setup.multiTimeframeConfluence.dailyTrend} · Hourly: {setup.multiTimeframeConfluence.hourlyBreakout}
            </div>
          </div>
        </div>

        {/* Recommended Position Sizing */}
        <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
          <div>
            <span className="text-xs font-bold text-slate-200 font-mono">Recommended Capital Allocation</span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Based on trade volatility and stop loss distance ({setup.stopLossPct}%), max risk should not exceed 1.5% of total portfolio equity.
            </p>
          </div>
          <div className="font-mono text-right shrink-0">
            <span className="text-xl font-bold text-emerald-400">{setup.recommendedPositionSizePct}%</span>
            <span className="text-[10px] text-slate-500 block">Of Total Book Capital</span>
          </div>
        </div>
      </div>

      {/* Action Directive */}
      <div className="p-4 bg-slate-900/70 rounded-2xl border border-slate-800 space-y-2">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
          Executive Desk Directive & Position Rules
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          {setup.traderPlaybook}
        </p>
      </div>
    </div>
  );
};
